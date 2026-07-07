import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/features/widget/widget-task-handler';

// Widget handler must register before the app entry so Android can render
// widgets even when the app UI never mounts.
registerWidgetTaskHandler(widgetTaskHandler);

import 'expo-router/entry';
