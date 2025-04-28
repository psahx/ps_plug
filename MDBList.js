// == Lampa Plugin: Interface Patcher - Step 1 ==
// Purpose: Inject CSS and verify identification of the target CUB/New Interface component.
//          Does NOT apply any functional patches yet.
// Strategy: Wrap Lampa.InteractionMain, use Listener + Element Check for init trigger.
(function (window) {
    'use strict';

    const PLUGIN_NAME = "InterfacePatcher Step 1 v1.0";

    // --- Lampa Readiness Check ---
    if (!window.Lampa || !window.Lampa.Listener || !window.Lampa.InteractionMain || !window.Lampa.Template || !window.Lampa.Storage || !window.Lampa.Api || !window.Lampa.Utils || !window.Lampa.Lang || !window.Lampa.Reguest || !window.Lampa.Account || !window.Lampa.Manifest) {
        console.error(`${PLUGIN_NAME}: Required Lampa components missing at script start.`);
        // Attempt to continue, but core functionality might fail later
    } else {
        console.log(`${PLUGIN_NAME}: Base Lampa components found.`);
    }

    // --- Constants ---
    const STYLE_ID = 'patched_new_interface_style_step1'; // Unique ID for the style tag
    const TARGET_CLASS = 'new-interface';             // Class on the root element of the target component
    const TARGET_INFO_ELEMENT_SELECTOR = '.new-interface-info'; // Unique element to confirm target interface presence

    // --- CSS Injection Function ---
    // Uses CSS rules from the "Modified Interface" code provided previously
    function injectCSS() {
        // Ensure Lampa components needed are loaded before proceeding
        if (!window.Lampa || !Lampa.Template || !window.$) {
             console.error(`${PLUGIN_NAME}: Cannot inject CSS - Lampa.Template or jQuery ($) not ready.`);
             return;
        }
        console.log(`${PLUGIN_NAME}: Attempting CSS injection...`);
        try {
            if ($('style[data-id="' + STYLE_ID + '"]').length) {
                 console.log(`${PLUGIN_NAME}: CSS already injected.`);
                 return;
             }
            // CSS content copied from the relevant <style> block of the "Modified Interface" code
            const css = `
            <style data-id="${STYLE_ID}">
                /* Height adjustment from modified CSS */
                .new-interface-info { height: 22.5em; } /* original was 24em */

                /* --- Rating Box Styles (Copied from Modified Interface code) --- */
                /* These styles are for the final look, even though elements are not patched yet */
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
            console.log(`${PLUGIN_NAME}: CSS Injected successfully.`);
        } catch (e) {
            console.error(`${PLUGIN_NAME}: Error injecting CSS`, e);
        }
    }

    // --- Wrapper and Initialization Logic ---
    let originalInteractionMainFactory = null; // Stores the original/CUB factory function
    let pluginInitializationAttempted = false; // Track if init was tried
    let pluginInitializationSucceeded = false; // Track if init succeeded (wrapping done)

    // This function will replace Lampa.InteractionMain
    function ourWrappedFactory(object) {
         console.log(`${PLUGIN_NAME}: Wrapped factory called for source:`, object?.source);
         let instance = null;
         try {
            // Ensure the factory captured during init is valid
            if (!originalInteractionMainFactory) {
                throw new Error("Original factory function was not captured during init.");
            }
            // Call the captured factory (should be the one set by CUB Interface script)
            instance = originalInteractionMainFactory(object);
             console.log(`${PLUGIN_NAME}: Original factory executed. Returned instance:`, !!instance);
         } catch (e) {
             console.error(`${PLUGIN_NAME}: Error calling original InteractionMain factory from wrapper`, e);
             return instance; // Return whatever we got (likely null or error state)
         }

         // If instance creation failed, return immediately
         if (!instance) {
             console.warn(`${PLUGIN_NAME}: Original factory returned no instance.`);
             return instance;
         }

         // Perform Identification Checks
         let conditionsMet = false;
         let isCorrectInstance = false;
         try {
            // 1. Predictive checks (should this instance be the CUB interface?)
            conditionsMet = (object.source == 'tmdb' || object.source == 'cub') &&
                            (window.innerWidth >= 767) &&
                            Lampa.Account.hasPremium() &&
                            (Lampa.Manifest.app_digital >= 153);

            // 2. Verification check (does the created instance look like the CUB interface?)
            if (instance.render) { // Check if render method exists
                 const renderedEl = instance.render();
                 // Check if it's a jQuery object and has the target class
                 isCorrectInstance = renderedEl && typeof renderedEl.hasClass === 'function' && renderedEl.hasClass(TARGET_CLASS);
            } else {
                 console.warn(`${PLUGIN_NAME}: Instance missing render() method for verification.`);
            }
            console.log(`${PLUGIN_NAME}: Instance identification check: conditionsMet=${conditionsMet}, isCorrectInstance=${isCorrectInstance}`);

         } catch (e) {
             console.error(`${PLUGIN_NAME}: Error during identification checks in wrapper`, e);
             // Fail safe - don't patch if checks error out
             conditionsMet = false;
             isCorrectInstance = false;
         }

         // **STEP 1 Action:** Log potential patching, but DO NOT patch.
         if (conditionsMet && isCorrectInstance) {
            console.log(`%c${PLUGIN_NAME}: Target instance identified. [PATCHING SKIPPED - STEP 1]`, 'color: blue; font-weight: bold;');
            // In future steps, the patching logic will be inserted here.
         } else {
             console.log(`${PLUGIN_NAME}: Instance is NOT the target OR conditions not met. No patch needed.`);
         }

         // Return the original, unmodified instance in this step
         return instance;
    }

    // Function to perform the core initialization (capturing and wrapping Lampa.InteractionMain)
    function initPlugin() {
        // Prevent multiple successful initializations or attempts after critical failure
        if (pluginInitializationSucceeded || pluginInitializationAttempted) {
             console.log(`${PLUGIN_NAME}: Init called but already initialized or attempted.`);
             return;
        }
        pluginInitializationAttempted = true; // Mark that we are trying now
        console.log(`${PLUGIN_NAME}: initPlugin() called. Attempting to wrap Lampa.InteractionMain...`);

        try {
            // Check Lampa.InteractionMain right before wrapping
            if (typeof Lampa.InteractionMain === 'function') {
                originalInteractionMainFactory = Lampa.InteractionMain; // Capture the current factory function
                Lampa.InteractionMain = ourWrappedFactory; // Replace it with our wrapper
                pluginInitializationSucceeded = true; // Mark success
                console.log(`%c${PLUGIN_NAME}: Successfully captured and wrapped Lampa.InteractionMain.`, 'color: green; font-weight: bold;');
            } else {
                console.error(`${PLUGIN_NAME}: Lampa.InteractionMain is not a function at init time! Cannot wrap.`);
                // Do not set succeeded flag
            }
        } catch (e) {
             console.error(`${PLUGIN_NAME}: CRITICAL Error during initPlugin execution (wrapping Lampa.InteractionMain):`, e);
             // Do not set succeeded flag
        }
    }

    // --- Plugin Start ---
    console.log(`${PLUGIN_NAME}: Script loaded. Waiting for Lampa app ready...`);
    Lampa.Listener.follow('app', (e) => {
        if (e.type == 'ready') {
            console.log(`${PLUGIN_NAME}: App ready event received.`);
            // Inject CSS as soon as app is ready
            injectCSS();

            // Listen for activities becoming ready to trigger the core initialization check
            Lampa.Listener.follow('activity_ready', (activityEvent) => {
                 console.debug(`${PLUGIN_NAME}: Activity ready event received.`);
                 // Only try to initialize if it hasn't succeeded or failed critically before
                 if (pluginInitializationSucceeded || pluginInitializationAttempted) {
                     // console.debug(`${PLUGIN_NAME}: Initialization already done or attempted, skipping activity check.`);
                     return;
                 }

                 try {
                    // Check required event properties safely
                    if (activityEvent && activityEvent.activity && typeof activityEvent.activity.render === 'function') {
                         const activityRendered = activityEvent.activity.render();
                         // Check if the specific target element exists in this activity's DOM
                         const targetElementFound = activityRendered && activityRendered.find(TARGET_INFO_ELEMENT_SELECTOR).length > 0;
                          console.debug(`${PLUGIN_NAME}: Checking activity DOM... Target element (${TARGET_INFO_ELEMENT_SELECTOR}) found: ${targetElementFound}`);

                         if (targetElementFound) {
                             console.log(`${PLUGIN_NAME}: Target element found in activity, calling initPlugin().`);
                             initPlugin(); // Attempt the core initialization (wrapping)
                         }
                    } else {
                         console.warn(`${PLUGIN_NAME}: Activity object or render method missing in activity_ready event payload.`);
                    }
                } catch (error) {
                    console.error(`${PLUGIN_NAME}: Error in activity_ready listener check:`, error);
                    pluginInitializationAttempted = true; // Mark attempt as failed if the check errors out, prevent retries
                }
            });
        }
    });

    // Add language string potentially needed by the original component's logic (safe check)
    if (window.Lampa.Lang && !Lampa.Lang.exist('full_notext')) {
         Lampa.Lang.add({ full_notext: { en: 'No description', ru: 'Нет описания'}, });
    }

})(window);
