/**
 * Extracted expense item from receipt
 */
export interface ExtractedExpenseItem {
  name: string;
  unitPriceCents: number;
  amount: number;
  taxPercent: number; // Tax rate as percent (e.g. 19)
  taxCents: number; // Tax amount in cents
  netCents: number; // needs to be calculated by subtracting taxCents from totalCents
  totalCents: number; // Gross amount
  description?: string;
  categoryId?: string;
}

export type InvoiceXml = Record<string, unknown>;

/**
 * Structured invoice data extracted from XML
 */
export interface ExtractedInvoiceStructure {
  format: 'zugferd' | 'xrechnung' | 'unknown';
  lineItems: ExtractedExpenseItem[];
  totals: {
    netCents: number;
    taxCents: number;
    grossCents: number;
  };
  from: string;
  invoiceDate: Date;
  invoiceNumber: string;
  subject: string;
}

export abstract class ReceiptStructuredStrategy {
  abstract extract(source: { xml: unknown; currency: string }): Promise<ExtractedInvoiceStructure>;

  /**
   * Attempts to retrieve the first object value for any of the provided keys from the parent object.
   *
   * This utility is essential for robustly navigating XML-derived JS objects, where a property may be
   * either a single object or an array of objects (due to XML-to-JSON conversion quirks).
   * It iterates through the list of candidate keys, and for each:
   *   - If the value is an array and its first element is an object, returns that first object.
   *   - If the value is a non-null object (but not an array), returns it directly.
   * If none of the keys yield an object, returns undefined.
   *
   * This approach is used to defensively access nested structures in invoice XMLs (e.g., ZUGFeRD, XRechnung),
   * where the presence and structure of fields can vary.
   *
   * @param parent The parent object to search within.
   * @param checkKeys An array of keys to check, in order of preference.
   * @returns The first found object for any key, or undefined if none found.
   */
  protected getFirstObject(
    parent: unknown,
    checkKeys: string[]
  ): Record<string, unknown> | undefined {
    // Defensive: Only proceed if parent is a non-null object
    if (!parent || typeof parent !== 'object') {
      return undefined;
    }

    for (const key of checkKeys) {
      const val = (parent as Record<string, unknown>)[key];
      // If the value is an array and its first element is an object, return that object
      if (Array.isArray(val) && typeof val[0] === 'object' && val[0] !== null) {
        return val[0] as Record<string, unknown>;
      }
      // If the value is a non-null object (but not an array), return it directly
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return val as Record<string, unknown>;
      }
    }
    // None of the keys yielded an object
    return undefined;
  }

  /**
   * Utility: Returns the first object from a property that may be an array or object.
   * @param val - A node that is either an object or an array of objects.
   * @returns The node itself if it is an object, or the first object in the array if it is an array.
   */
  protected getAsObject(val: unknown): Record<string, unknown> {
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
    if (Array.isArray(val) && typeof val[0] === 'object' && val[0] !== null) {
      return val[0] as Record<string, unknown>;
    }
    return {};
  }

  /**
   * Attempts to retrieve an array value for any of the provided keys from the parent object.
   *
   * This utility is essential for robustly navigating XML-derived JS objects, where a property may be
   * either a single object, an array of objects, or missing entirely (due to XML-to-JSON conversion quirks).
   * It iterates through the list of candidate keys, and for each:
   *   - If the value is an array, returns that array directly.
   * If none of the keys yield an array, returns an empty array.
   *
   * This approach is used to defensively access repeated/nested structures in invoice XMLs (e.g., ZUGFeRD, XRechnung),
   * where the presence and structure of fields can vary, and arrays may be present only for multiple elements.
   *
   * @param parent The parent object to search within.
   * @param keys An array of keys to check, in order of preference.
   * @returns The first found array for any key, or an empty array if none found.
   */
  protected getArray(parent: unknown, keys?: string[]): unknown[] {
    // Defensive: Only proceed if parent is a non-null object
    if (!parent || typeof parent !== 'object') {
      return [];
    }
    // Iterate through the provided keys to find the first array value
    for (const key of keys ?? []) {
      const val = (parent as Record<string, unknown>)[key];
      // If the value is an array, return it directly
      if (Array.isArray(val)) {
        return val;
      }
    }
    if (Array.isArray(parent)) {
      return parent;
    }
    if (parent !== undefined && parent !== null) {
      return [parent];
    }
    // None of the keys yielded an array; return empty array as fallback
    return [];
  }

  /**
   * Attempts to retrieve a string value for any of the provided keys from the parent object.
   *
   * This utility is essential for robustly navigating XML-derived JS objects, where a property may be
   * either a string, an array of strings, or missing entirely (due to XML-to-JSON conversion quirks).
   * It iterates through the list of candidate keys, and for each:
   *   - If the value is a string, returns it directly.
   *   - If the value is an array and its first element is a string, returns that string.
   *   - If the value is an object with a '_' property that is a string, returns that string.
   * If none of the keys yield a string, returns undefined.
   *
   * This approach is used to defensively access nested/repeated strings in invoice XMLs (e.g., ZUGFeRD, XRechnung),
   * where the presence and structure of fields can vary, and strings may be present only for multiple elements.
   *
   * @param parent The parent object to search within.
   * @param keys An array of keys to check, in order of preference.
   * @returns The first found string for any key, or undefined if none found.
   */
  protected getString(parent: unknown, keys: string[]): string | undefined {
    // Defensive: Only proceed if parent is a non-null object
    if (!parent || typeof parent !== 'object') {
      return undefined;
    }
    // Iterate through the provided keys to find the first string value
    for (const key of keys) {
      const parts = key.split('.');
      let val: unknown = parent;
      for (const part of parts) {
        if (val && typeof val === 'object' && part in val) {
          val = (val as Record<string, unknown>)[part];
        } else {
          val = undefined;
          break;
        }
      }
      // If the value is a string, return it directly
      if (typeof val === 'string') {
        return val;
      }
      // If the value is an object with a '_' property that is a string, return that string
      if (
        val &&
        typeof val === 'object' &&
        '_' in val &&
        typeof (val as { _: unknown })._ === 'string'
      ) {
        return (val as { _: string })._;
      }
    }
    // None of the keys yielded a string; return undefined as fallback
    return undefined;
  }

  /**
   * Returns the first string value from a property that may be a string, an array, or an object with a '_' property.
   *
   * This utility is essential for robustly extracting string values from XML-to-JSON converted objects,
   * where a field may appear as:
   *   - a direct string (e.g., "foo"),
   *   - an array of strings or objects (e.g., ["foo"], [{ _: "foo" }]),
   *   - or an object with a '_' property holding the string (e.g., { _: "foo" }).
   *
   * The function checks, in order:
   *   1. If the value is a string, returns it directly.
   *   2. If the value is an array:
   *      a. If the first element is a string, returns it.
   *      b. If the first element is an object with a '_' property that is a string, returns that string.
   *   3. If the value is an object with a '_' property that is a string, returns that string.
   *   4. Otherwise, returns undefined.
   *
   * This approach is defensive and tolerant of the various shapes XML-derived data can take,
   * especially when dealing with optional or repeated fields in invoice formats like ZUGFeRD or XRechnung.
   *
   * @param val The value to extract a string from.
   * @returns The first found string, or undefined if none found.
   */
  protected getFirstStr(val: unknown): string | undefined {
    // Case 1: Direct string
    if (typeof val === 'string') {
      return val;
    }

    // Case 2: Array (could be array of strings or array of objects)
    if (Array.isArray(val)) {
      // 2a: First element is a string
      if (typeof val[0] === 'string') {
        return val[0];
      }
      // 2b: First element is an object with a '_' property that is a string
      if (
        val[0] &&
        typeof val[0] === 'object' &&
        '_' in val[0] &&
        typeof (val[0] as { _: unknown })._ === 'string'
      ) {
        return (val[0] as { _: string })._;
      }
    }

    // Case 3: Object with a '_' property that is a string
    if (
      val !== null &&
      typeof val === 'object' &&
      '_' in val &&
      typeof (val as { _: unknown })._ === 'string'
    ) {
      return (val as { _: string })._;
    }

    // Fallback: No string found
    return undefined;
  }
}
