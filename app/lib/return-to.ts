const LOCAL_APP_ORIGIN = "http://localhost:3000";

export function getAppOrigin() {
  const configuredOrigin = process.env.APP_ORIGIN;

  if (configuredOrigin !== LOCAL_APP_ORIGIN) {
    throw new Error(`APP_ORIGIN must be set to ${LOCAL_APP_ORIGIN}.`);
  }

  return configuredOrigin;
}

export function getValidatedReturnTo(value: unknown, appOrigin = getAppOrigin()) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f#]/.test(value)
  ) {
    return null;
  }

  try {
    const decodedValue = decodeURIComponent(value);
    const decodedPath = decodeURIComponent(value.split("?", 1)[0]);

    if (
      decodedPath.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(decodedValue)
    ) {
      return null;
    }

    const destination = new URL(value, appOrigin);

    if (destination.origin !== appOrigin) {
      return null;
    }

    return `${destination.pathname}${destination.search}`;
  } catch {
    return null;
  }
}
