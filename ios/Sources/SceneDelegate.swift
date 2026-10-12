import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var piano: PianoViewController?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene = scene as? UIWindowScene else { return }
        let controller = PianoViewController()
        piano = controller
        let window = UIWindow(windowScene: scene)
        window.rootViewController = controller
        self.window = window
        window.makeKeyAndVisible()
    }

    func sceneWillResignActive(_ scene: UIScene) { piano?.pausePlayback() }
    func sceneDidEnterBackground(_ scene: UIScene) { piano?.deactivateAudio() }
    func sceneDidBecomeActive(_ scene: UIScene) { piano?.activateAudio() }
}
