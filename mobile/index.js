import { registerRootComponent } from 'expo';
import App from './App';
import { installCrashLogger } from './src/utils/crash-logger';

installCrashLogger();
registerRootComponent(App);
