import Cocoa
import Foundation

func emit(_ payload: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(payload),
          let data = try? JSONSerialization.data(withJSONObject: payload),
          var line = String(data: data, encoding: .utf8) else {
        return
    }

    line.append("\n")
    FileHandle.standardOutput.write(Data(line.utf8))
}

func appPayload(_ app: NSRunningApplication) -> [String: Any] {
    [
        "bundleId": app.bundleIdentifier ?? "",
        "name": app.localizedName ?? "",
        "pid": app.processIdentifier
    ]
}

func postPasteShortcut() -> Bool {
    guard let source = CGEventSource(stateID: .hidSystemState),
          let vDown = CGEvent(keyboardEventSource: source, virtualKey: 0x09, keyDown: true),
          let vUp = CGEvent(keyboardEventSource: source, virtualKey: 0x09, keyDown: false) else {
        return false
    }

    vDown.flags = .maskCommand
    vUp.flags = .maskCommand
    vDown.post(tap: .cghidEventTap)
    usleep(12_000)
    vUp.post(tap: .cghidEventTap)
    return true
}

func isFrontmostApp(bundleId: String, pid: pid_t) -> Bool {
    guard let frontmostApp = NSWorkspace.shared.frontmostApplication else {
        return false
    }

    if let frontmostBundleId = frontmostApp.bundleIdentifier, frontmostBundleId == bundleId {
        return true
    }

    return frontmostApp.processIdentifier == pid
}

func waitForFrontmostApp(bundleId: String, pid: pid_t, timeoutMs: UInt32 = 1200, pollMs: UInt32 = 40) -> Bool {
    let maxAttempts = max(1, Int(timeoutMs / pollMs))

    for _ in 0..<maxAttempts {
        if isFrontmostApp(bundleId: bundleId, pid: pid) {
            return true
        }
        usleep(pollMs * 1_000)
    }

    return isFrontmostApp(bundleId: bundleId, pid: pid)
}

func activateAndPaste(bundleId: String) -> [String: Any] {
    let runningApps = NSRunningApplication.runningApplications(withBundleIdentifier: bundleId)
    guard let app = runningApps.first else {
      return [
        "ok": false,
        "error": "目标应用不存在，无法自动粘贴。"
      ]
    }

    if #available(macOS 14.0, *) {
        _ = app.activate()
    } else {
        _ = app.activate(options: [.activateIgnoringOtherApps])
    }

    let didBecomeFrontmost = waitForFrontmostApp(bundleId: bundleId, pid: app.processIdentifier)
    if !didBecomeFrontmost {
        return [
          "ok": false,
          "error": "目标应用未能及时进入前台。"
        ]
    }

    usleep(90_000)

    guard postPasteShortcut() else {
      return [
        "ok": false,
        "error": "无法发送粘贴快捷键。"
      ]
    }

    return [
      "ok": true,
      "activated": true,
      "frontmostConfirmed": didBecomeFrontmost
    ]
}

let args = Array(CommandLine.arguments.dropFirst())
guard let command = args.first else {
    emit([
        "ok": false,
        "error": "缺少命令参数。"
    ])
    exit(1)
}

switch command {
case "frontmost":
    guard let app = NSWorkspace.shared.frontmostApplication else {
        emit([
            "ok": false,
            "error": "未找到当前前台应用。"
        ])
        exit(1)
    }

    emit([
        "ok": true,
        "app": appPayload(app)
    ])

case "activate-and-paste":
    guard args.count >= 2 else {
        emit([
            "ok": false,
            "error": "缺少目标应用 bundle id。"
        ])
        exit(1)
    }

    emit(activateAndPaste(bundleId: args[1]))

default:
    emit([
        "ok": false,
        "error": "不支持的命令：\(command)"
    ])
    exit(1)
}
