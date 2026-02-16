export const generateStrongPassword = (length: number = 8): string => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  let password = "";

  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(
    Math.floor(Math.random() * 26),
  );
  password += "0123456789".charAt(Math.floor(Math.random() * 10));
  password += "!@#$%&*".charAt(Math.floor(Math.random() * 7));

  for (let i = 0; i < length - 3; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
};
