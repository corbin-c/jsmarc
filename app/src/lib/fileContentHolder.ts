let fileContent: string | null = null

export function getFileContent(): string | null {
  return fileContent
}

export function setFileContent(content: string | null): void {
  fileContent = content
}
