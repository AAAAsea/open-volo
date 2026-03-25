#!/usr/bin/env swift

import AppKit
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

enum IconGenerationError: Error, CustomStringConvertible {
  case usage
  case missingSource(String)
  case invalidImage(String)
  case commandFailed(String)
  case writeFailed(String)

  var description: String {
    switch self {
    case .usage:
      return "Usage: swift scripts/generate-icons.swift <source-png>"
    case let .missingSource(path):
      return "Source image not found: \(path)"
    case let .invalidImage(path):
      return "Failed to decode PNG image: \(path)"
    case let .commandFailed(message):
      return message
    case let .writeFailed(path):
      return "Failed to write image: \(path)"
    }
  }
}

struct IconVariant {
  let name: String
  let size: Int
}

let windowsIconSizes = [16, 24, 32, 48, 64, 128, 256]
let iconVariants = [
  IconVariant(name: "icon_16x16.png", size: 16),
  IconVariant(name: "icon_16x16@2x.png", size: 32),
  IconVariant(name: "icon_32x32.png", size: 32),
  IconVariant(name: "icon_32x32@2x.png", size: 64),
  IconVariant(name: "icon_128x128.png", size: 128),
  IconVariant(name: "icon_128x128@2x.png", size: 256),
  IconVariant(name: "icon_256x256.png", size: 256),
  IconVariant(name: "icon_256x256@2x.png", size: 512),
  IconVariant(name: "icon_512x512.png", size: 512),
  IconVariant(name: "icon_512x512@2x.png", size: 1024),
]

extension Data {
  mutating func appendUInt16LE(_ value: UInt16) {
    append(UInt8(value & 0x00ff))
    append(UInt8((value >> 8) & 0x00ff))
  }

  mutating func appendUInt32LE(_ value: UInt32) {
    append(UInt8(value & 0x000000ff))
    append(UInt8((value >> 8) & 0x000000ff))
    append(UInt8((value >> 16) & 0x000000ff))
    append(UInt8((value >> 24) & 0x000000ff))
  }
}

func runCommand(_ executable: String, _ arguments: [String]) throws {
  let process = Process()
  process.executableURL = URL(fileURLWithPath: executable)
  process.arguments = arguments

  let stdoutPipe = Pipe()
  let stderrPipe = Pipe()
  process.standardOutput = stdoutPipe
  process.standardError = stderrPipe

  try process.run()
  process.waitUntilExit()

  guard process.terminationStatus == 0 else {
    let stderr = String(data: stderrPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
    let stdout = String(data: stdoutPipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
    let detail = [stdout.trimmingCharacters(in: .whitespacesAndNewlines), stderr.trimmingCharacters(in: .whitespacesAndNewlines)]
      .filter { !$0.isEmpty }
      .joined(separator: "\n")
    throw IconGenerationError.commandFailed("\(executable) failed.\n\(detail)")
  }
}

func writePNG(image: CGImage, to url: URL) throws {
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    throw IconGenerationError.writeFailed(url.path)
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else {
    throw IconGenerationError.writeFailed(url.path)
  }
}

func pngData(from image: CGImage) throws -> Data {
  let data = NSMutableData()
  guard let destination = CGImageDestinationCreateWithData(data, UTType.png.identifier as CFString, 1, nil) else {
    throw IconGenerationError.writeFailed("Unable to create PNG destination in memory.")
  }
  CGImageDestinationAddImage(destination, image, nil)
  guard CGImageDestinationFinalize(destination) else {
    throw IconGenerationError.writeFailed("Unable to finalize PNG data.")
  }
  return data as Data
}

func loadSourceImage(from sourceURL: URL) throws -> CGImage {
  guard
    let source = CGImageSourceCreateWithURL(sourceURL as CFURL, nil),
    let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    throw IconGenerationError.invalidImage(sourceURL.path)
  }
  return cgImage
}

func resizedImage(from image: CGImage, size: Int) throws -> CGImage {
  let bytesPerRow = size * 4
  var pixels = [UInt8](repeating: 0, count: size * bytesPerRow)
  let colorSpace = CGColorSpaceCreateDeviceRGB()

  let created = pixels.withUnsafeMutableBytes { bytes in
    CGContext(
      data: bytes.baseAddress,
      width: size,
      height: size,
      bitsPerComponent: 8,
      bytesPerRow: bytesPerRow,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
    )
  }

  guard let context = created else {
    throw IconGenerationError.invalidImage("Unable to create resize canvas.")
  }

  context.interpolationQuality = .high
  context.clear(CGRect(x: 0, y: 0, width: size, height: size))
  context.draw(image, in: CGRect(x: 0, y: 0, width: size, height: size))

  guard let resized = context.makeImage() else {
    throw IconGenerationError.invalidImage("Unable to render resized icon.")
  }

  return resized
}

func writeICO(from sourceImage: CGImage, to url: URL) throws {
  let pngBlobs = try windowsIconSizes.map { size -> (Int, Data) in
    let image = try resizedImage(from: sourceImage, size: size)
    return (size, try pngData(from: image))
  }

  var data = Data()
  data.appendUInt16LE(0)
  data.appendUInt16LE(1)
  data.appendUInt16LE(UInt16(pngBlobs.count))

  let directorySize = 6 + (16 * pngBlobs.count)
  var currentOffset = UInt32(directorySize)

  for (size, blob) in pngBlobs {
    data.append(UInt8(size == 256 ? 0 : size))
    data.append(UInt8(size == 256 ? 0 : size))
    data.append(0)
    data.append(0)
    data.appendUInt16LE(1)
    data.appendUInt16LE(32)
    data.appendUInt32LE(UInt32(blob.count))
    data.appendUInt32LE(currentOffset)
    currentOffset += UInt32(blob.count)
  }

  for (_, blob) in pngBlobs {
    data.append(blob)
  }

  try data.write(to: url)
}

func loadPixels(from sourceURL: URL) throws -> (width: Int, height: Int, pixels: [UInt8]) {
  let cgImage = try loadSourceImage(from: sourceURL)

  let width = cgImage.width
  let height = cgImage.height
  let bytesPerRow = width * 4
  var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)
  let colorSpace = CGColorSpaceCreateDeviceRGB()

  let created = pixels.withUnsafeMutableBytes { bytes in
    CGContext(
      data: bytes.baseAddress,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: bytesPerRow,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
    )
  }

  guard let context = created else {
    throw IconGenerationError.invalidImage(sourceURL.path)
  }

  context.interpolationQuality = .high
  context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

  return (width, height, pixels)
}

func averageBackgroundColor(width: Int, height: Int, pixels: [UInt8]) -> (Double, Double, Double) {
  let sampleEdge = max(8, min(width, height) / 48)
  let corners = [
    (0, 0),
    (max(0, width - sampleEdge), 0),
    (0, max(0, height - sampleEdge)),
    (max(0, width - sampleEdge), max(0, height - sampleEdge)),
  ]

  var totalR = 0.0
  var totalG = 0.0
  var totalB = 0.0
  var count = 0.0

  for (startX, startY) in corners {
    for y in startY..<(startY + sampleEdge) {
      for x in startX..<(startX + sampleEdge) {
        let offset = ((y * width) + x) * 4
        totalR += Double(pixels[offset]) / 255.0
        totalG += Double(pixels[offset + 1]) / 255.0
        totalB += Double(pixels[offset + 2]) / 255.0
        count += 1
      }
    }
  }

  return (totalR / count, totalG / count, totalB / count)
}

func makeProcessedTemplateImage(width: Int, height: Int, pixels: [UInt8]) throws -> (CGImage, CGRect) {
  let bytesPerRow = width * 4
  let background = averageBackgroundColor(width: width, height: height, pixels: pixels)
  var processed = [UInt8](repeating: 0, count: height * bytesPerRow)
  let colorSpace = CGColorSpaceCreateDeviceRGB()

  var minX = width
  var minY = height
  var maxX = 0
  var maxY = 0
  var hasVisiblePixel = false

  let softThreshold = 0.05
  let solidThreshold = 0.17
  let normalization = sqrt(3.0)

  for y in 0..<height {
    for x in 0..<width {
      let offset = ((y * width) + x) * 4
      let alpha = Double(pixels[offset + 3]) / 255.0
      if alpha <= 0.001 { continue }

      let red = Double(pixels[offset]) / 255.0
      let green = Double(pixels[offset + 1]) / 255.0
      let blue = Double(pixels[offset + 2]) / 255.0

      let distance = sqrt(
        pow(red - background.0, 2) +
        pow(green - background.1, 2) +
        pow(blue - background.2, 2)
      ) / normalization

      let normalized = max(0.0, min(1.0, (distance - softThreshold) / (solidThreshold - softThreshold)))
      let outputAlpha = UInt8(max(0.0, min(255.0, normalized * alpha * 255.0)).rounded())
      if outputAlpha == 0 { continue }

      processed[offset] = 0
      processed[offset + 1] = 0
      processed[offset + 2] = 0
      processed[offset + 3] = outputAlpha

      hasVisiblePixel = true
      minX = min(minX, x)
      minY = min(minY, y)
      maxX = max(maxX, x)
      maxY = max(maxY, y)
    }
  }

  guard hasVisiblePixel else {
    throw IconGenerationError.invalidImage("No visible pixels left after tray icon processing.")
  }

  let created = processed.withUnsafeMutableBytes { bytes in
    CGContext(
      data: bytes.baseAddress,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: bytesPerRow,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
    )
  }

  guard let context = created, let cgImage = context.makeImage() else {
    throw IconGenerationError.invalidImage("Unable to build tray icon image.")
  }

  let contentWidth = maxX - minX + 1
  let contentHeight = maxY - minY + 1
  let paddedSide = Double(max(contentWidth, contentHeight)) * 1.28
  let cropRect = CGRect(
    x: Double(minX) - (paddedSide - Double(contentWidth)) / 2.0,
    y: Double(minY) - (paddedSide - Double(contentHeight)) / 2.0,
    width: paddedSide,
    height: paddedSide
  ).integral

  let imageBounds = CGRect(x: 0, y: 0, width: width, height: height)
  return (cgImage, cropRect.intersection(imageBounds))
}

func makeTrayImage(from template: CGImage, cropRect: CGRect, size: Int) throws -> CGImage {
  let bytesPerRow = size * 4
  var pixels = [UInt8](repeating: 0, count: size * bytesPerRow)
  let colorSpace = CGColorSpaceCreateDeviceRGB()

  let created = pixels.withUnsafeMutableBytes { bytes in
    CGContext(
      data: bytes.baseAddress,
      width: size,
      height: size,
      bitsPerComponent: 8,
      bytesPerRow: bytesPerRow,
      space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
    )
  }

  guard let context = created else {
    throw IconGenerationError.invalidImage("Unable to create tray icon canvas.")
  }

  context.clear(CGRect(x: 0, y: 0, width: size, height: size))
  context.interpolationQuality = .high

  guard let cropped = template.cropping(to: cropRect) else {
    throw IconGenerationError.invalidImage("Unable to crop tray icon content.")
  }

  let inset = Double(size) * 0.08
  let destination = CGRect(
    x: inset,
    y: inset,
    width: Double(size) - inset * 2.0,
    height: Double(size) - inset * 2.0
  )
  context.draw(cropped, in: destination)

  guard let image = context.makeImage() else {
    throw IconGenerationError.invalidImage("Unable to render tray icon.")
  }

  return image
}

do {
  guard CommandLine.arguments.count == 2 else {
    throw IconGenerationError.usage
  }

  let sourcePath = CommandLine.arguments[1]
  let sourceURL = URL(fileURLWithPath: sourcePath)
  guard FileManager.default.fileExists(atPath: sourceURL.path) else {
    throw IconGenerationError.missingSource(sourceURL.path)
  }

  let repoRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
  let iconsetDirectory = FileManager.default.temporaryDirectory
    .appendingPathComponent("volo-icon-\(UUID().uuidString).iconset", isDirectory: true)
  let icnsURL = repoRoot.appendingPathComponent("assets/icon.icns")
  let icoURL = repoRoot.appendingPathComponent("assets/icon.ico")
  let trayDirectory = repoRoot.appendingPathComponent("electron/resources", isDirectory: true)
  let trayIconURL = trayDirectory.appendingPathComponent("tray-icon-template.png")
  let trayIcon2xURL = trayDirectory.appendingPathComponent("tray-icon-template@2x.png")

  defer {
    try? FileManager.default.removeItem(at: iconsetDirectory)
  }

  try FileManager.default.createDirectory(at: iconsetDirectory, withIntermediateDirectories: true, attributes: nil)
  try FileManager.default.createDirectory(at: trayDirectory, withIntermediateDirectories: true, attributes: nil)

  for variant in iconVariants {
    let destinationURL = iconsetDirectory.appendingPathComponent(variant.name)
    try runCommand(
      "/usr/bin/sips",
      ["-z", "\(variant.size)", "\(variant.size)", sourceURL.path, "--out", destinationURL.path]
    )
  }

  try runCommand("/usr/bin/iconutil", ["-c", "icns", iconsetDirectory.path, "-o", icnsURL.path])

  let sourceImage = try loadSourceImage(from: sourceURL)
  try writeICO(from: sourceImage, to: icoURL)

  let sourcePixels = try loadPixels(from: sourceURL)
  let (template, cropRect) = try makeProcessedTemplateImage(
    width: sourcePixels.width,
    height: sourcePixels.height,
    pixels: sourcePixels.pixels
  )

  try writePNG(image: try makeTrayImage(from: template, cropRect: cropRect, size: 18), to: trayIconURL)
  try writePNG(image: try makeTrayImage(from: template, cropRect: cropRect, size: 36), to: trayIcon2xURL)

  print("Generated app icon assets from \(sourceURL.path)")
  print(" - \(icnsURL.path)")
  print(" - \(icoURL.path)")
  print(" - \(trayIconURL.path)")
  print(" - \(trayIcon2xURL.path)")
} catch {
  fputs("\(error)\n", stderr)
  exit(1)
}
