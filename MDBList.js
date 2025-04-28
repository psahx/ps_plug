// == Lampa Plugin: Interface Patcher - Step 6.2 ==
// Purpose: Re-test CSS Injection ONLY. Confirms if CSS causes the error.
//          Injects CSS from modified interface and does nothing else.
// Strategy: Inject CSS on app:ready.
// Version: 6.2 (CSS Injection Only - Re-Test)
(function () {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 6.2 (CSS Only Re-Test)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.Template || !window.$ || !window.Lampa.Lang) {
        console.error(`${PLUGIN_NAME}: Required Lampa components (Listener, Template, $, Lang) missing.`);
        return; // Cannot proceed
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step6'; // Use new ID for this step series

    // --- CSS Injection Function ---
    function injectCSS() {
        console.log(`${PLUGIN_NAME}: Attempting CSS injection (Style ID: ${STYLE_ID})...`);
        try {
            // Remove potentially conflicting styles from previous test versions
            $('style[data-id^="patched_new_interface_style_step"]').remove();

            if ($('style[data-id="' + STYLE_ID + '"]').length) {
                console.log(`${PLUGIN_NAME}: CSS already injected.`);
                return;
            }
            // CSS content copied from the relevant <style> block of the "Modified Interface" code provided by user previously
            const css = `
            <style data-id="${STYLE_ID}">
                /* Height adjustment from modified CSS */
                .new-interface-info { height: 22.5em; } /* original was 24em */

                /* --- Rating Box Styles (Copied from Modified Interface code) --- */
                .new-interface .full-start__rate {
                    font-size: 1.3em; margin-right: 0em; display: inline-flex; align-items: center;
                    vertical-align: middle; background-color: rgba(255, 255, 255, 0.12);
                    padding: 0 0.2em 0 0; border-radius: 0.3em; gap: 0.5em; overflow: hidden; height: auto;
                }
                .new-interface .full-start__rate > div {
                    font-weight: normal; font-size: 1em; justify-content: center;
                    background-color: rgba(0, 0, 0, 0.4); color: #ffffff; padding: 0.1em 0.3em;
                    border-radius: 0.3em; line-height: 1.3; order: 1; display: flex;
                    align-items: center; flex-shrink: 0;
                }
                 .rt-rating-item > div.rt-score { padding-left: 1.2em; padding-right: 1.2em; }
                 .placeholder-value { color: rgba(255, 255, 255, 0.6); }
                .rating-logo {
                    height: 1.1em; width: auto; max-width: 75px; vertical-align: middle;
                    order: 2; line-height: 0; flex-shrink: 0;
                }
                .tmdb-logo { height: 0.9em; }
                .rt-logo { height: 1.1em; }
                /* --- End Rating Box Styles --- */

                /* Base styles (Copied from Modified Interface code) */
                 .new-interface .card--small.card--wide { width: 18.3em; }
                 .new-interface-info { position: relative; padding: 1.5em; }
                .new-interface-info__body { width: 80%; padding-top: 1.1em; }
                .new-interface-info__head { color: rgba(255, 255, 255, 0.6); margin-bottom: 1em; font-size: 1.3em; min-height: 1em; }
                .new-interface-info__head span { color: #fff; }
                .new-interface-info__title { font-size: 4em; font-weight: 600; margin-bottom: 0.3em; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; margin-left: -0.03em; line-height: 1.3; }
                .new-interface-info__details { margin-bottom: 1.6em; display: flex; align-items: center; flex-wrap: wrap; min-height: 1.9em; font-size: 1.1em; gap: 0.5em 0; }
                .new-interface-info__split { margin: 0 1em; font-size: 0.7em; display: inline-block; vertical-align: middle; }
                .new-interface-info__description { font-size: 1.2em; font-weight: 300; line-height: 1.5; overflow: hidden; text-overflow: "."; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; width: 70%; }
                .new-interface .card-more__box { padding-bottom: 95%; }
                .new-interface .full-start__background { height: 108%; top: -6em; }
                .new-interface .card__promo { display: none; }
                .new-interface .card.card--wide+.card-more .card-more__box { padding-bottom: 95%; }
                .new-interface .card.card--wide .card-watched { display: none !important; }
                body.light--version .new-interface-info__body { width: 69%; padding-top: 1.5em; }
                body.light--version .new-interface-info { height: 25.3em; }
                body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view { animation: animation-card-focus 0.2s; }
                body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view { animation: animation-trigger-enter 0.2s forwards; }
            </style>
            `;
            Lampa.Template.add(STYLE_ID, css);
            $('body').append(Lampa.Template.get(STYLE_ID, {}, true));
            console.log(`%c${PLUGIN_NAME}: CSS Injected successfully.`, 'color: green');
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Error injecting CSS`, e);
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            // ** ONLY Action: Inject CSS **
            injectCSS();
            console.log(`${PLUGIN_NAME}: Initialization complete (CSS injection only).`);
        }
    });

    // Add language string potentially needed by base Lampa/CUB (safe check)
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(); // Standard IIFE end
