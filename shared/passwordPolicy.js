export const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 12 characters, start with an upper-case letter, and include a lower-case letter and a number.";

export const isStrongPassword = (value) => {
  const password = String(value || "");
  return (
    password.length >= 12 &&
    /^[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
};

export const assertStrongPassword = (value) => {
  if (isStrongPassword(value)) return;
  throw Object.assign(new Error(PASSWORD_POLICY_MESSAGE), { status: 400 });
};
