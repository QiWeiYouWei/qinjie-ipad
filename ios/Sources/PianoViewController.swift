import UIKit
import WebKit
import UniformTypeIdentifiers
import AVFoundation

private final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var owner: PianoViewController?
    init(owner: PianoViewController) { self.owner = owner }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        owner?.receive(message)
    }
}

final class PianoViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, UIDocumentPickerDelegate {
    private enum ImportKind: Equatable { case songs, records }
    private var pendingImport: ImportKind?
    private var webView: WKWebView?
    private var indexURL: URL?
    private let maximumBytes = 2_000_000
    private let backgroundColor = UIColor(red: 0.97, green: 0.96, blue: 0.93, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = backgroundColor
        guard let webFolder = Bundle.main.url(forResource: "Web", withExtension: nil),
              let bridgeURL = Bundle.main.url(forResource: "Bridge", withExtension: "js"),
              let bridge = try? String(contentsOf: bridgeURL, encoding: .utf8) else {
            showMissingResources()
            return
        }
        let index = webFolder.appendingPathComponent("index.html")
        guard FileManager.default.fileExists(atPath: index.path) else { showMissingResources(); return }
        indexURL = index.standardizedFileURL
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.userContentController.add(WeakScriptHandler(owner: self), name: "qinjie")
        configuration.userContentController.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let browser = WKWebView(frame: .zero, configuration: configuration)
        webView = browser
        browser.navigationDelegate = self
        browser.uiDelegate = self
        browser.isOpaque = false
        browser.backgroundColor = backgroundColor
        browser.scrollView.bounces = false
        browser.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(browser)
        let safe = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            browser.leadingAnchor.constraint(equalTo: safe.leadingAnchor),
            browser.trailingAnchor.constraint(equalTo: safe.trailingAnchor),
            browser.topAnchor.constraint(equalTo: safe.topAnchor),
            browser.bottomAnchor.constraint(equalTo: safe.bottomAnchor)
        ])
        activateAudio()
        browser.loadFileURL(index, allowingReadAccessTo: webFolder)
    }

    private func showMissingResources() {
        let label = UILabel(frame: view.bounds)
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        label.numberOfLines = 0
        label.textAlignment = .center
        label.text = "琴阶资源未打包完整。\n请重新运行 scripts/sync-ios-web.cjs 后构建。"
        view.addSubview(label)
    }

    func activateAudio() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch { notice("声音初始化失败，请重启应用后再试。") }
    }

    func pausePlayback() { callJavaScript("pausePiano", arguments: []) }
    func deactivateAudio() { try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation) }

    fileprivate func receive(_ message: WKScriptMessage) {
        guard message.name == "qinjie", message.frameInfo.isMainFrame,
              message.frameInfo.request.url?.standardizedFileURL == indexURL,
              let body = message.body as? [String: Any], let action = body["action"] as? String else { return }
        switch action {
        case "importSongs": chooseFile(.songs)
        case "importData": chooseFile(.records)
        case "exportSongs", "exportData":
            guard let text = body["data"] as? String, text.utf8.count <= maximumBytes else {
                notice("导出文件超过2MB，请拆分曲库后重试。")
                return
            }
            export(text, songs: action == "exportSongs")
        default: break
        }
    }

    private func chooseFile(_ kind: ImportKind) {
        guard presentedViewController == nil else { return }
        pausePlayback()
        pendingImport = kind
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json, .plainText, .data], asCopy: true)
        picker.delegate = self
        picker.allowsMultipleSelection = false
        present(picker, animated: true)
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { pendingImport = nil }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let kind = pendingImport, let url = urls.first else { return }
        pendingImport = nil
        let secured = url.startAccessingSecurityScopedResource()
        defer { if secured { url.stopAccessingSecurityScopedResource() } }
        let text: String
        do {
            let values = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
            guard values.isRegularFile == true, let size = values.fileSize, size <= maximumBytes else {
                throw ImportError.tooLarge
            }
            let data = try Data(contentsOf: url, options: .mappedIfSafe)
            guard data.count <= maximumBytes else { throw ImportError.tooLarge }
            guard let decoded = String(data: data, encoding: .utf8) else { throw ImportError.encoding }
            text = decoded
        } catch {
            controller.dismiss(animated: true) { [weak self] in
                self?.notice(error is ImportError ? "请选择不超过2MB的UTF-8 JSON文件。" : "文件读取失败，请先把文件下载到这台iPad。")
            }
            return
        }
        controller.dismiss(animated: true) { [weak self] in
            self?.callJavaScript(kind == .songs ? "importPianoSongs" : "importPianoState", arguments: [text])
        }
    }

    private enum ImportError: Error { case tooLarge, encoding }

    private func export(_ text: String, songs: Bool) {
        guard presentedViewController == nil else { return }
        do {
            let folder = FileManager.default.temporaryDirectory.appendingPathComponent("QinjieExports", isDirectory: true)
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyyMMdd-HHmmss-SSS"
            let name = (songs ? "琴阶曲库-" : "琴阶记录-") + formatter.string(from: Date()) + (songs ? ".qinjie.json" : ".json")
            let file = folder.appendingPathComponent(name)
            try Data(text.utf8).write(to: file, options: .atomic)
            let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = view
            share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            share.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: file) }
            present(share, animated: true)
        } catch { notice("导出失败，请检查设备剩余空间。") }
    }

    private func notice(_ text: String) { callJavaScript("nativeNotice", arguments: [text]) }

    private func callJavaScript(_ name: String, arguments: [String]) {
        let allowed = ["pausePiano", "nativeNotice", "importPianoSongs", "importPianoState"]
        guard allowed.contains(name), let data = try? JSONSerialization.data(withJSONObject: arguments, options: [.fragmentsAllowed]),
              var json = String(data: data, encoding: .utf8) else { return }
        json = json.replacingOccurrences(of: "\u{2028}", with: "\\u2028").replacingOccurrences(of: "\u{2029}", with: "\\u2029")
        webView?.evaluateJavaScript("if(typeof window.\(name)==='function'){window.\(name).apply(null,\(json));}", completionHandler: nil)
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard navigationAction.targetFrame?.isMainFrame == true, navigationAction.request.url?.standardizedFileURL == indexURL else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard presentedViewController == nil else { completionHandler(); return }
        let alert = UIAlertController(title: "琴阶", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard presentedViewController == nil else { completionHandler(false); return }
        let alert = UIAlertController(title: "琴阶", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "确认", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
}
