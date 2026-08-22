import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)

    // Sem isto a Apple nunca emite um token APNs e nenhuma push chega: o
    // firebase_messaging conta com o registo automatico do ciclo de vida
    // classico do UIApplicationDelegate, que o template novo do Flutter
    // (SceneDelegate + FlutterImplicitEngineDelegate) nao desencadeia.
    // Confirmado por inspecao do .ipa: o entitlement aps-environment e o
    // perfil de distribuicao estavam ambos correctos, faltava a chamada.
    //
    // Vai depois do super porque e ai que os plugins ja estao registados —
    // e o plugin do firebase_messaging que recebe o token e o entrega ao
    // Firebase, atraves do FlutterAppDelegate.
    application.registerForRemoteNotifications()

    return result
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
