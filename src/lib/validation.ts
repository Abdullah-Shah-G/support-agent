export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePriority(priority: string): priority is "low" | "medium" | "high" {
  return ["low", "medium", "high"].includes(priority);
}
