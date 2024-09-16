import cryptoRandomString from "crypto-random-string";
import {
  DATABASE_NAME,
  isUserLoginSchema,
  isUserRegisterSchema,
  isUserSchemaValid,
  UserGeneralSchema,
  UserLoginSchema,
  UserRegisterSchema,
  UserUpdateScheme,
} from "../../utils";
import { Database } from "bun:sqlite";
import argon2 from "argon2";
import jwt from "@elysiajs/jwt";

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
  const db = new Database(DATABASE_NAME, { strict: true });
  // check if email, username, or phone number already exists
  const query = db.query(
    `SELECT * FROM users WHERE email = $email OR username = $username OR phoneNumber = $phoneNumber`,
  );
  const dataInside = query.all(schemaAlignedUser);
  if (dataInside.length > 0) {
    set.status = 409;
    db.close();
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
  // insert user
  const query2 = db.query(
    `INSERT INTO users (username, password, email, firstName, lastName, phoneNumber, roomNumber, salt, registeredOn, lastLogInOn, role) 
    VALUES ($username, $password, $email, $firstName, $lastName, $phoneNumber, $roomNumber, $salt, $registeredOn, $lastLogInOn,0)`,
  );
  query2.run(schemaAlignedUser);
  db.close();
  console.log("User Created : ", body.username);

  return userSchemaVerified;
}

export async function login({
  set,
  body,
  userToken,
  cookie: { auth },
}: {
  set: { status: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userToken: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const db = new Database(DATABASE_NAME, { strict: true });
  const query = db.query(`SELECT * FROM users WHERE email = $email`);
  const data: UserGeneralSchema = query.get(body) as UserGeneralSchema;
  if (!data) {
    set.status = 401;
    db.close();
    return "Invalid Credentials";
  }
  if (!data.salt || !data.password) {
    set.status = 401;
    db.close();
    return "Invalid Credentials";
  }

  const isValidCredentials = await argon2.verify(
    data.password!,
    body.password + data.salt + process.env.PASSWORD_PEPPER,
  );
  //console.log("Credentials : ", isValidCredentials);

  if (!isValidCredentials) {
    set.status = 401;
    db.close();
    return "Invalid Credentials";
  }
  auth.set({
    value: await userToken.sign({
      username: data.username,
      iat: Date.now(),
      id: data.id,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookie: { auth: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userToken: any;
}) {
  let token = headers.authorization;
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  }
  if (headers.authorization === undefined) {
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
  const db = new Database(DATABASE_NAME, { strict: true });
  const query = db.query(`SELECT * FROM users WHERE username = $username`);
  const data = query.get({ username: username }) as UserGeneralSchema;
  db.close();
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookie: { auth: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userToken: any;
}) {
  let token = headers.authorization;
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  }
  if (headers.authorization === undefined) {
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
  const db = new Database(DATABASE_NAME, { strict: true });
  const query = db.query(`SELECT * FROM users WHERE username = $username`);
  const data = query.get({ username: profile.username }) as UserGeneralSchema;

  if (!data.password) {
    set.status = 401;
    db.close();
    return "Invalid Credentials";
  }

  const isPasswordCorrect = await argon2.verify(
    data.password!,
    body.password + data.salt! + process.env.PASSWORD_PEPPER,
  );
  if (!isPasswordCorrect) {
    set.status = 401;
    return "Wrong Password";
  }

  // check if username is taken
  if (body.username) {
    const query1 = db.query(`SELECT * FROM users WHERE username = $username`);
    const dataInside = query1.all({ username: body.username });
    if (dataInside.length > 0) {
      set.status = 409;
      db.close();
      return "Username already taken";
    }
  }
  // email too
  if (body.email) {
    const query1 = db.query(`SELECT * FROM users WHERE email = $email`);
    const dataInside = query1.all({ email: body.email });
    if (dataInside.length > 0) {
      set.status = 409;
      db.close();
      return "Email already taken";
    }
  }
  // also phone number
  if (body.phoneNumber) {
    const query1 = db.query(
      `SELECT * FROM users WHERE phoneNumber = $phoneNumber`,
    );
    const dataInside = query1.all({ phoneNumber: body.phoneNumber });
    if (dataInside.length > 0) {
      set.status = 409;
      db.close();
      return "Phone Number already taken";
    }
  }
  // update user profile but if null then keep the existing value in the Database
  if (!body.username) {
    body.username = profile.username;
  }
  if (!body.firstName) {
    body.firstName = data.firstName;
  }
  if (!body.lastName) {
    body.lastName = data.lastName;
  }
  if (!body.phoneNumber) {
    body.phoneNumber = data.phoneNumber;
  }
  if (!body.roomNumber) {
    body.roomNumber = data.roomNumber;
  }
  if (!body.profileImage) {
    body.profileImage = data.profileImage;
  }

  const query2 = db.query(
    `UPDATE users SET username = $username, firstName = $firstName, lastName = $lastName, phoneNumber = $phoneNumber, roomNumber = $roomNumber, profileImage = $profileImage WHERE username = $origUsername`,
  );

  query2.run({
    username: body.username!,
    firstName: body.firstName!,
    lastName: body.lastName!,
    phoneNumber: body.phoneNumber!,
    roomNumber: body.roomNumber!,
    profileImage: body.profileImage!,
    origUsername: profile.username!,
  });
  db.close();
  return "Profile Updated";
}

export async function deleteUser({
  userToken,
  headers,
  set,
  body,
  cookie: { auth },
}: {
  set: { status: number };
  body: UserUpdateScheme;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookie: { auth: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userToken: any;
}) {
  let token = headers.authorization;
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  }
  if (headers.authorization === undefined) {
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
  const db = new Database(DATABASE_NAME, { strict: true });
  const query = db.query(`SELECT * FROM users WHERE username = $username`);
  const data = query.get({ username: profile.username }) as UserGeneralSchema;
  if (!body) {
    set.status = 401;
    return "Bad Request";
  }
  if (!data) {
    set.status = 401;
    db.close();
    return "Invalid Credentials";
  }

  const isPasswordCorrect = await argon2.verify(
    data.password!,
    body.password + data.salt! + process.env.PASSWORD_PEPPER,
  );
  if (!isPasswordCorrect) {
    set.status = 401;
    return "Wrong Password";
  }
  // delete user from database
  const query2 = db.query(`DELETE FROM users WHERE username = $username`);
  query2.run({ username: profile.username });
  db.close();
  return "User Deleted";
}

// Define the function to verify the JWT
export async function verifyToken({
  jwt, // Access jwt from the Elysia context
  headers,
  set,
  cookie: { auth },
}: {
  set: { status: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headers: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cookie: { auth: any };
  // Access jwt from the Elysia context
  jwt: {
    sign: (payload: any) => Promise<string>;
    verify: (token: string) => Promise<any>;
  };
}) {
  let token = headers.authorization;

  // Check for token in Authorization header or cookies
  if (token !== undefined) {
    token = token.replace("Bearer ", "");
  } else if (auth?.value) {
    token = auth.value;
  }

  // If token is missing, return 401
  if (token === undefined) {
    set.status = 401;
    return "Token is missing";
  }

  try {
    // Verify the token using the Elysia jwt instance
    const verifiedToken = await jwt.verify(token);
    return {
      valid: true,
      data: verifiedToken, // return token payload data
    };
  } catch (err) {
    set.status = 401;
    return "Invalid or expired token";
  }
}
