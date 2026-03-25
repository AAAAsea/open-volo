import Cocoa
import ApplicationServices
import Foundation

final class FnMonitor {
    private var tap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var lastPressed = false

    func run() {
        let trusted = AXIsProcessTrusted()
        emit(["type": "permission", "trusted": trusted])

        let eventMask = CGEventMask(1 << CGEventType.flagsChanged.rawValue)
        let callback: CGEventTapCallBack = { _, type, event, userInfo in
            guard let userInfo else {
                return Unmanaged.passUnretained(event)
            }

            let monitor = Unmanaged<FnMonitor>.fromOpaque(userInfo).takeUnretainedValue()
            return monitor.handle(type: type, event: event)
        }

        tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: eventMask,
            callback: callback,
            userInfo: UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
        )

        guard let tap else {
            emit([
                "type": "error",
                "message": "无法建立 Fn 事件监听。请在系统设置中为应用开启“输入监控”，必要时同时开启“辅助功能”后重试。"
            ])
            exit(1)
        }

        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
        guard let runLoopSource else {
            emit([
                "type": "error",
                "message": "无法创建 Fn 监听运行循环。"
            ])
            exit(1)
        }

        CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: tap, enable: true)
        emit(["type": "ready"])
        CFRunLoopRun()
    }

    private func handle(type: CGEventType, event: CGEvent) -> Unmanaged<CGEvent>? {
        if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
            if let tap {
                CGEvent.tapEnable(tap: tap, enable: true)
            }
            return Unmanaged.passUnretained(event)
        }

        guard type == .flagsChanged else {
            return Unmanaged.passUnretained(event)
        }

        let pressed = event.flags.contains(.maskSecondaryFn)
        if pressed == lastPressed {
            return Unmanaged.passUnretained(event)
        }

        lastPressed = pressed
        emit([
            "type": "fn",
            "phase": pressed ? "down" : "up"
        ])
        return nil
    }
}

private func emit(_ payload: [String: Any]) {
    guard JSONSerialization.isValidJSONObject(payload),
          let data = try? JSONSerialization.data(withJSONObject: payload),
          var line = String(data: data, encoding: .utf8) else {
        return
    }

    line.append("\n")
    FileHandle.standardOutput.write(Data(line.utf8))
}

FnMonitor().run()
