/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'BloomwishWidget',
  deploymentTarget: '17.0',
  colors: {
    $widgetBackground: '#3E7C59',
    $widgetAccent: '#E9B44C',
  },
  entitlements: {
    'com.apple.security.application-groups': ['group.com.bloomwish.app'],
  },
};
