import { Platform } from 'react-native';

// Widget handler must register before the app entry so Android can render
// widgets even when the app UI never mounts. Android-only native module —
// keep it out of iOS/web bundles' startup path.
if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/features/widget/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}

require('expo-router/entry');
