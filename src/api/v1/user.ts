import cryptoRandomString from "crypto-random-string";
import {
  isUserLoginSchema,
  isUserRegisterSchema,
  isUserSchemaValid,
  UserLoginSchema,
  UserRegisterSchema,
  UserUpdateScheme,
} from "../../utils";
import { Context } from "elysia";
// import { Database } from "bun:sqlite";
import argon2 from "argon2";
// import jwt from "@elysiajs/jwt";
import { MongoClient } from "mongodb";
import { getDb } from "../../utils";
import { ObjectId } from "mongodb";

type Params = {
  username: string;
};

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI environment variable is not defined");
}
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

export async function createUser({
  set,
  body,
}: {
  set: { status: number };
  body: unknown;
}) {
  if (!isUserRegisterSchema(body)) {
    set!.status = 400;
    return "Bad Request";
  }

  const userSchemaVerified = isUserSchemaValid(body);
  if (!userSchemaVerified.result) {
    set.status = 400;
    return userSchemaVerified;
  }

  const schemaAlignedUser: UserRegisterSchema = body as UserRegisterSchema;

  try {
    await client.connect();
    const db = client.db("test");
    const collection = db.collection("users");

    // Check if the email, username, or phone number already exists
    const existingUser = await collection.findOne({
      $or: [
        { email: schemaAlignedUser.email },
        { username: schemaAlignedUser.username },
        { phoneNumber: schemaAlignedUser.phoneNumber },
      ],
    });

    if (existingUser) {
      set.status = 409;
      return "Cannot create user";
    }

    const salt = cryptoRandomString({ length: 20, type: "url-safe" });
    schemaAlignedUser.salt = salt;
    schemaAlignedUser.password = await argon2.hash(
      schemaAlignedUser.password + salt + process.env.PASSWORD_PEPPER,
    );
    const currentTime = Date.now().toFixed(0);
    schemaAlignedUser.registeredOn = BigInt(currentTime);
    schemaAlignedUser.lastLogInOn = BigInt(currentTime);

    // Insert user into MongoDB
    const result = await collection.insertOne({
      ...schemaAlignedUser,
      role: 0, // Default role
    });

    console.log("User Created: ", schemaAlignedUser.username);
    return userSchemaVerified;
  } finally {
    await client.close();
  }
}

export async function login({
  set,
  body,
  userToken,
  cookie: { auth },
}: {
  set: { status: number };
  body: any;
  userToken: any;
  cookie: { auth: any };
}) {
  if (!isUserLoginSchema(body)) {
    set.status = 401;
    return "Bad Request";
  }

  body = body as UserLoginSchema;
  if (!body.email && !body.username) {
    set.status = 401;
    return "Bad Request";
  }

  const db = getDb();
  const usersCollection = db.collection("users");

  // Search user by email or username
  const data = await usersCollection.findOne({
    $or: [{ email: body.email }, { username: body.username }],
  });

  if (!data || !data.salt || !data.password) {
    set.status = 401;
    return "Invalid Credentials";
  }

  const isValidCredentials = await argon2.verify(
    data.password,
    body.password + data.salt + process.env.PASSWORD_PEPPER,
  );

  if (!isValidCredentials) {
    set.status = 401;
    return "Invalid Credentials";
  }

  auth.set({
    value: await userToken.sign({
      username: data.username,
      iat: Date.now(),
      id: data._id,
    }),
    httpOnly: process.env.IS_DEV === "true",
    maxAge: 60 * 60 * 24 * 7,
    path: "/api/v1",
  });

  return auth.value;
}

export async function getUser({
  params: { username },
  userToken,
  headers,
  set,
  cookie: { auth },
}: {
  params: { username: string };
  set: { status: number };
  body: any;
  headers: any;
  cookie: { auth: any };
  userToken: any;
}) {
  let token = headers.authorization;
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  } else if (auth.value !== undefined) {
    token = auth.value;
  }

  if (token === undefined) {
    set.status = 401;
    return "Unauthorized";
  }

  let profile = await userToken.verify(token);
  if (!profile) {
    set.status = 401;
    return "Unauthorized";
  }

  profile = profile as {
    username: string;
    iat: number;
  };

  const db = getDb();
  const usersCollection = db.collection("users");

  // Fetch user data by username
  const data = await usersCollection.findOne({ username });

  if (!data) {
    set.status = 404;
    return "User not found";
  }

  if (profile.username !== data.username) {
    return {
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      profileImage: data.profileImage,
    };
  }

  return {
    username: data.username,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    roomNumber: data.roomNumber,
    role: data.role,
    profileImage: data.profileImage,
  };
}

export async function getUserById({
  params: { id }, // Accept `id` as the parameter
  userToken,
  headers,
  set,
  cookie: { auth },
}: {
  params: { id: string }; // Change to accept `id` instead of `username`
  set: { status: number };
  body: any;
  headers: any;
  cookie: { auth: any };
  userToken: any;
}) {
  let token = headers.authorization;
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  } else if (auth.value !== undefined) {
    token = auth.value;
  }

  if (token === undefined) {
    set.status = 401;
    return "Unauthorized";
  }

  let profile = await userToken.verify(token);
  if (!profile) {
    set.status = 401;
    return "Unauthorized";
  }

  profile = profile as {
    username: string;
    iat: number;
  };

  const db = getDb();
  const usersCollection = db.collection("users");

  // Convert the `id` string to a MongoDB ObjectId
  let objectId;
  try {
    objectId = new ObjectId(id); // Convert `id` to ObjectId
  } catch (err) {
    set.status = 400; // Bad request if `id` is invalid
    return "Invalid ID format";
  }

  // Fetch user data by ObjectId
  const data = await usersCollection.findOne({ _id: objectId });

  if (!data) {
    set.status = 404;
    return "User not found";
  }

  // Check if the logged-in user is trying to access their own profile
  if (profile.username !== data.username) {
    return {
      username: data.username,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      profileImage: data.profileImage,
    };
  }

  return {
    username: data.username,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
    roomNumber: data.roomNumber,
    role: data.role,
    profileImage: data.profileImage,
  };
}

export async function updateSelfProfile({
  userToken,
  headers,
  set,
  body,
  cookie: { auth },
}: {
  set: { status: number };
  body: UserUpdateScheme;
  headers: any;
  cookie: { auth: any };
  userToken: any;
}) {
  let token = headers.authorization;
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  } else if (auth.value !== undefined) {
    token = auth.value;
  }

  if (token === undefined) {
    set.status = 401;
    return "Unauthorized";
  }

  let profile = await userToken.verify(token);
  if (!profile) {
    set.status = 401;
    return "Unauthorized";
  }

  profile = profile as {
    username: string;
    iat: number;
  };

  const db = getDb();
  const usersCollection = db.collection("users");

  // Fetch the current user data
  const data = await usersCollection.findOne({ username: profile.username });

  if (!data || !data.password) {
    set.status = 401;
    return "Invalid Credentials";
  }

  const isPasswordCorrect = await argon2.verify(
    data.password,
    body.password + data.salt + process.env.PASSWORD_PEPPER,
  );

  if (!isPasswordCorrect) {
    set.status = 401;
    return "Wrong Password";
  }

  // Check if username, email, or phone number is already taken
  if (body.username) {
    const existingUsername = await usersCollection.findOne({
      username: body.username,
    });
    if (existingUsername) {
      set.status = 409;
      return "Username already taken";
    }
  }

  if (body.email) {
    const existingEmail = await usersCollection.findOne({
      email: body.email,
    });
    if (existingEmail) {
      set.status = 409;
      return "Email already taken";
    }
  }

  if (body.phoneNumber) {
    const existingPhone = await usersCollection.findOne({
      phoneNumber: body.phoneNumber,
    });
    if (existingPhone) {
      set.status = 409;
      return "Phone Number already taken";
    }
  }

  // Update user profile
  await usersCollection.updateOne(
    { username: profile.username },
    {
      $set: {
        username: body.username || profile.username,
        firstName: body.firstName || data.firstName,
        lastName: body.lastName || data.lastName,
        phoneNumber: body.phoneNumber || data.phoneNumber,
        roomNumber: body.roomNumber || data.roomNumber,
        profileImage: body.profileImage || data.profileImage,
      },
    },
  );

  return "Profile Updated";
}

export async function deleteUser({
  userToken,
  headers,
  set,
  cookie: { auth },
}: {
  set: { status: number };
  body: any;
  headers: any;
  cookie: { auth: any };
  userToken: any;
}) {
  let token = headers.authorization;
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  } else if (auth.value !== undefined) {
    token = auth.value;
  }

  if (token === undefined) {
    set.status = 401;
    return "Unauthorized";
  }

  let profile = await userToken.verify(token);
  if (!profile) {
    set.status = 401;
    return "Unauthorized";
  }

  profile = profile as {
    username: string;
    iat: number;
  };

  const db = getDb();
  const usersCollection = db.collection("users");

  // Delete the user by username
  await usersCollection.deleteOne({ username: profile.username });

  return "User Deleted";
}

export async function verifyToken(context: Context) {
  const { headers, cookie } = context;
  const userToken = (context as any).userToken; // Assume JWT functions are available under `userToken`

  // Extract the JWT from the Authorization header or cookie
  let token = headers.authorization
    ? headers.authorization.replace("Bearer ", "")
    : cookie?.auth?.value;

  if (!token) {
    context.set.status = 401; // Unauthorized
    return "Token is missing";
  }

  try {
    const verifiedToken = await userToken.verify(token); // Verify the JWT

    if (!verifiedToken) {
      context.set.status = 401; // Unauthorized
      return "Invalid or expired token";
    }

    return {
      valid: true,
      user: verifiedToken, // Optionally return the decoded user information
    };
  } catch (error) {
    context.set.status = 401; // Unauthorized
    return "Invalid or expired token";
  }
}
