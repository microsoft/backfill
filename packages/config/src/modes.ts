export const modesObject = {
  READ_ONLY: "",
  WRITE_ONLY: "",
  READ_WRITE: "",
  PASS: "",
};

export type BackfillModes = keyof typeof modesObject;

export function isCorrectMode(mode: string): mode is BackfillModes {
  return modesObject.hasOwnProperty(mode);
}
