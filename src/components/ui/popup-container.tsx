'use client';

import * as React from 'react';

/**
 * Ref to the DOM node that Base UI popups (e.g. Combobox) rendered inside it
 * should portal into instead of `<body>`.
 *
 * Radix's modal Dialog sets `pointer-events: none` on `<body>` while open and
 * only re-enables pointer events on the dialog's own layer. A Base UI popup
 * portaled to `<body>` renders above the dialog, but every click on it is
 * dead - and even with pointer events restored, Radix would treat presses on
 * it as an "outside press" and dismiss the dialog. Portaling the popup into
 * the dialog content keeps it inside the layer, so item clicks work and the
 * dialog stays open.
 *
 * The context carries the ref (not the element) so providers don't need a
 * mounted element at render time and consumers don't re-render when the
 * element attaches - Base UI resolves `ref.current` when the popup opens.
 */
const PopupContainerContext = React.createContext<React.RefObject<HTMLElement | null> | null>(null);

export const PopupContainerProvider = PopupContainerContext.Provider;

export function usePopupContainer(): React.RefObject<HTMLElement | null> | null {
  return React.useContext(PopupContainerContext);
}
