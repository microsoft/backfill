import pLimit from "p-limit";

const MAX_FILE_OPERATIONS = 4000;

export const diskLimit = pLimit(MAX_FILE_OPERATIONS);
