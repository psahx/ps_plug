// == Lampa Plugin: Interface Patcher - Step 4.1 ==
// Purpose: Use flag polling to detect CUB interface readiness, then check
//          if the target DOM element exists shortly after. NO wrapping/patching.
// Strategy: Poll flag, then setTimeout + DOM check, log result.
// Version: 4.1 (Flag Poll + Element Check)
(function () {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 4.1 (Flag Poll + Element Check)";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.$) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing.`);
        // Cannot proceed reliably without basic components like $
        return;
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step4'; // New ID for this step series
    const POLLING_INTERVAL_MS = 250;
    const MAX_POLLING_ATTEMPTS = 60; // ~15 seconds
    const TARGET_INFO_ELEMENT_SELECTOR = '.new-interface-info'; // Element to check for

    // --- CSS Injection Function ---
    function injectCSS() {
        console.log(`${PLUGIN_NAME}: Attempt CSS inject (Style ID: ${STYLE_ID})...`);
        try {
            // Remove potentially conflicting styles from previous steps
            $('style[data-id^="patched_new_interface_style_step"]').remove();
            if ($('style[data-id="' + STYLE_ID + '"]').length) { return; } // Already injected
            // Using CSS relevant to the *final* goal, injected early
            const css = `<style data-id="${STYLE_ID}">/* ... FULL CSS content as provided before ... */ .new-interface-info{height:22.5em;}.new-interface .full-start__rate{font-size:1.3em;margin-right:0em;display:inline-flex;align-items:center;vertical-align:middle;background-color:rgba(255,255,255,0.12);padding:0 0.2em 0 0;border-radius:0.3em;gap:0.5em;overflow:hidden;height:auto;}.new-interface .full-start__rate>div{font-weight:normal;font-size:1em;justify-content:center;background-color:rgba(0,0,0,0.4);color:#fff;padding:0.1em 0.3em;border-radius:0.3em;line-height:1.3;order:1;display:flex;align-items:center;flex-shrink:0;}.rt-rating-item>div.rt-score{padding-left:1.2em;padding-right:1.2em;}.placeholder-value{color:rgba(255,255,255,0.6);}.rating-logo{height:1.1em;width:auto;max-width:75px;vertical-align:middle;order:2;line-height:0;flex-shrink:0;}.tmdb-logo{height:.9em;}.rt-logo{height:1.1em;}.new-interface .card--small.card--wide{width:18.3em;}.new-interface-info{position:relative;padding:1.5em;}.new-interface-info__body{width:80%;padding-top:1.1em;}.new-interface-info__head{color:rgba(255,255,255,0.6);margin-bottom:1em;font-size:1.3em;min-height:1em;}.new-interface-info__head span{color:#fff;}.new-interface-info__title{font-size:4em;font-weight:600;margin-bottom:.3em;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:1;line-clamp:1;-webkit-box-orient:vertical;margin-left:-0.03em;line-height:1.3;}.new-interface-info__details{margin-bottom:1.6em;display:flex;align-items:center;flex-wrap:wrap;min-height:1.9em;font-size:1.1em;gap:.5em 0;}.new-interface-info__split{margin:0 1em;font-size:.7em;display:inline-block;vertical-align:middle;}.new-interface-info__description{font-size:1.2em;font-weight:300;line-height:1.5;overflow:hidden;text-overflow:".";display:-webkit-box;-webkit-line-clamp:4;line-clamp:4;-webkit-box-orient:vertical;width:70%;}.new-interface .card-more__box{padding-bottom:95%;}.new-interface .full-start__background{height:108%;top:-6em;}.new-interface .card__promo{display:none;}.new-interface .card.card--wide+.card-more .card-more__box{padding-bottom:95%;}.new-interface .card.card--wide .card-watched{display:none!important;}body.light--version .new-interface-info__body{width:69%;padding-top:1.5em;}body.light--version .new-interface-info{height:25.3em;}body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.focus .card__view{animation:animation-card-focus .2s} body.advanced--animation:not(.no--animation) .new-interface .card--small.card--wide.animate-trigger-enter .card__view{animation:animation-trigger-enter .2s forwards}</style>`;
            Lampa.Template.add(STYLE_ID, css); $('body').append(Lampa.Template.get(STYLE_ID, {}, !0));
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) { console.error(`${PLUGIN_NAME}: CSS injection error`, e); }
    }

    // --- Initialization Logic ---
    let pollingIntervalId = null;
    let pollingAttempts = 0;
    let initializationDone = false; // Simple flag to ensure findElement runs only once

    // Function to check the DOM for the target element
    function findElement() {
        console.log(`${PLUGIN_NAME}: findElement() called.`);
        try {
            const $element = $(TARGET_INFO_ELEMENT_SELECTOR);
            const found = $element.length > 0;
            console.log(`%c${PLUGIN_NAME}: Element check result: '${TARGET_INFO_ELEMENT_SELECTOR}' found: ${found}`, found ? 'color: green' : 'color: orange');
            if (found) {
                console.log(`${PLUGIN_NAME}: Target element details:`, $element[0]); // Log the DOM element itself
                // In future steps, DOM patching logic would go here.
            } else {
                 console.log(`${PLUGIN_NAME}: Target element not found in current DOM.`);
            }
        } catch(e) {
             console.error(`${PLUGIN_NAME}: Error during findElement check:`, e);
        }
    }

    // Polling function to check for the CUB interface flag
    function checkFlagAndFindElement() {
        // Stop checking if we already ran the check
        if (initializationDone) {
            if (pollingIntervalId) clearInterval(pollingIntervalId);
            pollingIntervalId = null;
            return;
        }

        pollingAttempts++;
        // console.debug(`${PLUGIN_NAME}: Polling attempt #${pollingAttempts}/${MAX_POLLING_ATTEMPTS} for window.plugin_interface_ready...`);

        // Check for the flag set by the CUB script
        if (window.plugin_interface_ready === true) {
            console.log(`%c${PLUGIN_NAME}: Flag window.plugin_interface_ready detected! (Attempt #${pollingAttempts}). Scheduling element check.`, 'color: green');
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Stop polling
            pollingIntervalId = null;
            initializationDone = true; // Mark that we've passed the flag check stage

            // Schedule the DOM check shortly after flag detection
            setTimeout(findElement, 100); // 100ms delay to allow potential DOM updates

        } else if (pollingAttempts >= MAX_POLLING_ATTEMPTS) {
            console.warn(`${PLUGIN_NAME}: Max polling attempts reached (${MAX_POLLING_ATTEMPTS}) without detecting flag window.plugin_interface_ready. Element check will not run.`);
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Stop polling
            pollingIntervalId = null;
            initializationDone = true; // Also mark as done to stop further polling attempts if any leak
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded.`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            injectCSS(); // Inject CSS

            // Start polling for the CUB interface flag
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Clear previous just in case
            pollingAttempts = 0;
            initializationDone = false; // Reset init flag on app ready
            console.log(`${PLUGIN_NAME}: Starting polling for flag 'window.plugin_interface_ready' (Max ${MAX_POLLING_ATTEMPTS} attempts @ ${POLLING_INTERVAL_MS}ms)...`);

            checkFlagAndFindElement(); // Initial check

            // Start interval only if not already initialized by the first check
            if (!initializationDone && !pollingIntervalId) {
                 pollingIntervalId = setInterval(checkFlagAndFindElement, POLLING_INTERVAL_MS);
            }
        }
    });

    // Add language string if needed
    if (window.Lampa && Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})();
