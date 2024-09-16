import jwt from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { fallbackRoute } from "./api/v1/fallback";
import {
  createUser,
  deleteUser,
  getUser,
  login,
  updateSelfProfile,
  verifyToken,
} from "./api/v1/user";
import { createDatabaseIfItDoesNotExist } from "./utils";
const app = new Elysia()
  .use(
    jwt({
      name: "userToken", // The name under which JWT is registered in the context
      secret: process.env.JWT_SECRET!, // Ensure the JWT secret is set correctly
    }),
  )
  .get("/", () => "TEST COMPLETE")

  // Public Routes (No JWT Verification)
  .post("/api/v1/register", createUser)
  .post("/api/v1/login", login)

  // Protected Routes (Require JWT Verification)
  .get("/api/v1/user/:username", async (context) => {
    const tokenResult = await verifyToken({
      jwt: context.userToken, // Elysia provides jwt in the context
      headers: context.headers,
      set: { status: Number(context.set.status) },
      cookie: { auth: context.cookie?.auth || { value: undefined } },
    });
    if (typeof tokenResult === "string") {
      return tokenResult; // Return the error message directly
    }
    if (!tokenResult.valid) {
      return "Unauthorized access"; // Return error if token is not valid
    }

    // Proceed to get user if token is valid
    return getUser({
      ...context,
      set: { status: Number(context.set.status) },
      cookie: {
        ...context.cookie,
        auth: context.cookie.auth || { value: undefined }, // Provide a default auth value
      },
    });
  })

  .get("/api/v1/user/:username", getUser)
  .put("/api/v1/user/update", updateSelfProfile)
  .delete("/api/v1/user/delete", deleteUser)
  .get("/api/v1/*", fallbackRoute)
  .get("/api/v1/*", fallbackRoute)
  .listen(process.env.PORT!);

createDatabaseIfItDoesNotExist();

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
