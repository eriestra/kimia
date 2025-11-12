/**
 * HTTP Routes for Convex Auth
 *
 * Exposes authentication endpoints for the Kimia platform.
 */

// @ts-ignore - httpRouter is available at runtime from convex/server
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Mount authentication routes
auth.addHttpRoutes(http);

export default http;
