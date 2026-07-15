import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    hasSubscription?: boolean;
  }
  interface Session {
    user: {
      id: string;
      hasSubscription: boolean;
    } & DefaultSession["user"];
  }
}
