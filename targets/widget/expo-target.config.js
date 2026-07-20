/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: "widget",
  displayName: "Grit Widgets",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": ["group.com.gritfitness.app"],
  },
};
