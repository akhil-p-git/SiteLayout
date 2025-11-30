declare module 'xmldom' {
  export class DOMParser {
    parseFromString(xmlString: string, mimeType?: string): Document;
  }
}
