import jwt from "@elysiajs/jwt";
import { Elysia } from "elysia";
import { fallbackRoute } from "./api/v1/fallback";
import { createUser } from "./api/v1/user";
const app = new Elysia()
  .use(
    jwt({
      name: "userToken",
      secret: process.env.JWT_SECRET!,
    }),
  )
  .get("/", () => "TEST COMPLETE")
  .post("/api/v1/register", createUser)
  .get("/api/v1/*", fallbackRoute)
  .get("/api/v1/*", fallbackRoute)
  .listen(process.env.PORT!);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
