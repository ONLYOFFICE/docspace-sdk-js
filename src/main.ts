import SDK from "./sdk";
import SDKInstance from "./instance";
export * from "./types";
export * from "./enums";
export * from "./constants";
export * from "./utils";

window.DocSpace = window.DocSpace || {};

window.DocSpace.SDK = window.DocSpace.SDK || new SDK();

export { SDK, SDKInstance };