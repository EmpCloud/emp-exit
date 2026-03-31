// Override Express ParamsDictionary to return string (not string | string[])
// This matches Express 4 behavior and avoids casting in every route handler.
import "express";

declare module "express" {
  interface ParamsDictionary {
    [key: string]: string;
  }
}
