import { isUserRegisterSchema, userRegisterSchema } from "../../utils";

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
  console.log("User Created : ", body);
  return `${JSON.stringify(body)}\n\nUser Created`;
}

export async function updateUserProfile({ body }: { body: never }) {
  return "User Profile Updated";
}

export async function deleteUser() {
  return "User Deleted";
}
