export const mailRegex = /^[^@]+@[^@]+\.[^@]+$/g;

export interface userRegisterSchema {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isUserRegisterSchema = (obj: any): obj is userRegisterSchema => {
  return (
    obj &&
    obj.username &&
    obj.password &&
    obj.email &&
    obj.firstName &&
    obj.lastName &&
    obj.phoneNumber
  );
};

export interface userLoginSchema {
  username: string;
  password: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isUserLoginSchema = (obj: any): obj is userLoginSchema => {
  return obj && obj.username && obj.password;
};
