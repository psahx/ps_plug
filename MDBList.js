// == Lampa Plugin: Interface Patcher - Step 6.3 ==
// Purpose: Test Minimal CSS Rule. Injects ONLY the height rule for .new-interface-info.
// Strategy: Inject minimal CSS on app:ready.
// Version: 6.3 (Minimal CSS Test)
(function () {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 6.3 (Minimal CSS Test)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.Template || !window.$ || !window.Lampa.Lang) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`); return;
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step6_3'; // New ID for this specific test

    // --- CSS Injection Function ---
    function injectCSS() {
        console.log(`${PLUGIN_NAME}: Attempting CSS injection (Style ID: ${STYLE_ID})...`);
        try {
            // We are NOT removing previous styles in this version, as requested.
            // If issues arise, consider manually clearing styles between tests.

            if ($('style[data-id="' + STYLE_ID + '"]').length) {
                console.log(`${PLUGIN_NAME}: Minimal CSS already injected.`);
                return;
            }

            // ** MINIMAL CSS RULES FOR THIS TEST **
            const css = `
            <style data-id="${STYLE_ID}">
                /* Height adjustment from modified CSS */
                .new-interface-info {
                    height: 22.5em !important; /* original was 24em - Added !important for testing visibility */
                }

                /* TEMPORARY - Add a visible border to confirm CSS application */
                 /* If you see a lime border on the info box, this CSS is active */
                .new-interface-info {
                     border: 1px solid lime !important;
                     box-sizing: border-box; /* Include border in dimensions */
                }

            </style>
            `;
            Lampa.Template.add(STYLE_ID, css);
            $('body').append(Lampa.Template.get(STYLE_ID, {}, true));
            console.log(`%c${PLUGIN_NAME}: Minimal CSS Injected successfully.`, 'color: green');
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Error injecting minimal CSS`, e);
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            // ** ONLY Action: Inject Minimal CSS **
            injectCSS();
            console.log(`${PLUGIN_NAME}: Initialization complete (Minimal CSS injection only).`);
        }
    });

    // Add language string potentially needed (safe check)
    // Keep this in case the original component relies on it, even if we aren't patching yet
    if (window.Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(); // Standard IIFE end
