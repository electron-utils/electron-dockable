# Known Issues

## mouse-leave didn't triggerred

When you drag drop a tab, the `mouseleave` will not triggerred. This will cause several problems with css `:hover` effect for the tabs.

To solve the problem, I think I should try to use `webContents.sendInput()` to manually send a `mouseleave` or `mouseenter` event.