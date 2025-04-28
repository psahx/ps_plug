// == Lampa Plugin: Interface Patcher - Step 6.4 ==
// Purpose: Test Border CSS Rule ONLY. Injects only a visible border style.
// Strategy: Inject minimal border CSS on app:ready.
// Version: 6.4 (Border CSS Only Test)
(function () {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 6.4 (Border CSS Only)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.Template || !window.$ || !window.Lampa.Lang) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`); return;
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step6_4'; // New ID for this specific test

    // --- CSS Injection Function ---
    function injectCSS() {
        console.log(`${PLUGIN_NAME}: Attempting CSS injection (Style ID: ${STYLE_ID})...`);
        try {
            // Remove potentially conflicting styles from previous test versions
            $('style[data-id^="patched_new_interface_style_step"]').remove();

            if ($('style[data-id="' + STYLE_ID + '"]').length) {
                console.log(`${PLUGIN_NAME}: Minimal CSS (Border Only) already injected.`);
                return;
            }

            // ** MINIMAL CSS RULES FOR THIS TEST - BORDER ONLY **
            const css = `
            <style data-id="${STYLE_ID}">
                /* TEMPORARY - Add a visible border ONLY to confirm CSS application */
                 /* If you see a lime border on the info box, this CSS is active */
                .new-interface-info {
                     border: 1px solid lime !important;
                     box-sizing: border-box; /* Include border in dimensions */
                }
                /* NO other rules from the modified CSS included in this test */
            </style>
            `;
            Lampa.Template.add(STYLE_ID, css);
            $('body').append(Lampa.Template.get(STYLE_ID, {}, true));
            console.log(`%c${PLUGIN_NAME}: Minimal CSS (Border Only) Injected successfully.`, 'color: green');
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Error injecting minimal CSS (Border Only)`, e);
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            // ** ONLY Action: Inject Minimal Border CSS **
            injectCSS();
            console.log(`${PLUGIN_NAME}: Initialization complete (Border CSS injection only).`);
        }
    });

    // Add language string potentially needed (safe check)
    if (window.Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(); // Standard IIFE end
