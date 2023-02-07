/*  HOW TO:
1. Grab the Mass Cure Wounds from the Spells (SRD) compendium.
2. Add an onUse macro for either ItemMacro, or macro name, executed After Targeting Complete and copy-paste this macro.
3. In the activation condition field add a string including a combination of the following: 
   - "auto": if you want to auto target if less than 6 valid Targets. Choosing "auto" will only affect the Dialog creation if the valid Targets <= 6.
   - "all": if you want to be able to affect all tokens, no matter the disposition.
   - "allies": if you want to be able to affect only allied tokens compared to the caster.
   - "enemies": if you want to be able to affect only enemy tokens compared to the caster.
   eg. Activation condition of: "auto allies" will auto target allied tokens if less than 6 available, else a dialog will pop up with the available valid Targets.
4. Cast the spell.

Keep in mind that:
   - the valid Tokens will be filtered to only show ones with missing HP,
   - there should be at least an option selected in MidiQOL settings about targeting with templates.
*/

const bugbearTargets = args[0]?.item?.system.activation.condition?.toLowerCase().includes("allies") ? "allies" : args[0]?.item?.system.activation.condition.toLowerCase().includes("enemies") ? "enemies" : "all" 
const auto = args[0]?.item?.system.activation.condition.toLowerCase().includes("auto") //Or change it to false if you want to make it always pop a target dialog

game.MassCureWounds = [];

let initialTargets = args[0]?.targets.map(t=>t.object) ?? Array.from(game.user.targets);
initialTargets = getValidTargets(initialTargets, bugbearTargets)
if (initialTargets.length <= 6 && !!auto) return game.user.updateTokenTargets(initialTargets.map(t=>t.id));
game.MassCureWoundsInitialTargets = initialTargets;
let initialContent = initialDialogContent(initialTargets)
let dialogInitial = await targetingDialog(initialContent, initialTargets)

function getValidTargets(initialTargets, validTargets) {
    if (validTargets === "allies") return initialTargets.filter(tok=>tok.actor.system.attributes.hp.value < tok.actor.system.attributes.hp.max && tok.document.disposition === canvas.tokens.get(args[0].tokenId).document.disposition);
    else if (validTargets === "enemies") return initialTargets.filter(tok=>tok.actor.system.attributes.hp.value < tok.actor.system.attributes.hp.max && tok.document.disposition !== canvas.tokens.get(args[0].tokenId).document.disposition);
    else return initialTargets.filter(tok=>tok.actor.system.attributes.hp.value < tok.actor.system.attributes.hp.max)
}

function initialDialogContent(targets) {
    let initialTargets = targets.reduce((acc, target) => acc += `<img width="36" height="36" src="${target?.document.texture.src}" title="${target.name}" id="${target.id}"/>`,``);
    let content = `<center><b>Selected targets ${game.MassCureWounds.length} of 6</b></center><hr><form><div class="form-group"><label for="type">Targets available:</label><div class="form-fields"><center><div class="mainTargetImages"><a class="mainTargetImg">${initialTargets}</a></div></center></div></div></form>`
    return(content);
}
function targetSelectedContent({id, dialogContent, availableTargets}) {
    let content;
    let selectedTargets = game.MassCureWounds.reduce((acc, target) => acc += `<img width="36" height="36" src="${target?.document.texture.src}" title="${target.name}" id="${target.id}"/>`,``);
    content = dialogContent;
    if (game.MassCureWounds.length < 6 && (initialTargets.filter(tok=>!game.MassCureWounds.includes(tok)).length > 0  || initialTargets.length == 1)){
        let searchString = content.split(`</form>`)[0]+`</form>`;
        let replaceString = initialDialogContent(availableTargets)
        content = dialogContent.replace(searchString, replaceString);
        if (content.split(`</form>`)[1].length) {
            searchString = content.split(`</form>`)[1]
            replaceString = `<form><div class="form-group"><label for="type">Targets selected:</label><div class="form-fields"><center><div class="selectedTargetImages"><a class="selectedTargetImg">${selectedTargets}</a></div></center></div></div></form>`
            content = content.replace(searchString, replaceString);
        }
        else content += `<form><div class="form-group"><label for="type">Targets selected:</label><div class="form-fields"><center><div class="selectedTargetImages"><a class="selectedTargetImg">${selectedTargets}</a></div></center></div></div></form>`
    }
    else {
        let searchString = content.split(`</form>`)[0]+`</form>`+content.split(`</form>`)[1].split(`</form>`)[0]+`</form>`;
        let replaceString = `<center><b>Selected targets ${game.MassCureWounds.length} of 6</b></center><hr><form><div class="form-group"><label for="type">Targets selected:</label><div class="form-fields"><center><div class="selectedTargetImages"><a class="selectedTargetImg">${selectedTargets}</a></div></center></div></div></form>`
        content = dialogContent.replace(searchString, replaceString);
    }
return content;
}   

// Dialog for choosing targets
async function targetingDialog(content, initialTargets, healingPool) {
    let d
    const mainDialog = await new Promise((resolve, reject) => {
        d = new Dialog({
            title: "Mass Cure Wounds",
            content,
            render: (html) => {
                availableTargets = getProperty(d.options, "availableTargets") ?? [];
                containerMain = document.querySelector('.mainTargetImg');
                clickMain = containerMain && containerMain.addEventListener('click', async function getMain(event) {
                    target = event.target;
                    if (target.nodeName!='IMG') d.render(true)
                    if (target.nodeName == "IMG" && (mainTargetID = target.getAttribute('id'))) {
                        mainChosenTarget = canvas.tokens.get(mainTargetID)
                        game.MassCureWounds.push(mainChosenTarget)
                        availableTargets = initialTargets.filter(tok=>!game.MassCureWounds.includes(tok))
                        chosenMainContent = targetSelectedContent({id:mainTargetID,availableTargets:availableTargets,dialogContent:d.data.content})
                        buttons = [{label: "Heal selected", callback: async (html) => {                        
                            let targetIds = Array.from([html[0].querySelector(".selectedTargetImg")][0].children).map(i=>i.id);
                            let results=[];
                            game.user.updateTokenTargets(targetIds)
                            results.push(target);
                            resolve(results)
                        }},{label: "Reset selected", callback: (html) => {
                            game.MassCureWounds=[]
                            let contentNew = initialDialogContent(game.MassCureWoundsInitialTargets)
                            d.data.content = contentNew
                            d.data.buttons = {}
                            d.render(true)
                        }}]
                        d.data.content = chosenMainContent
                        d.data.buttons = buttons
                        d.render(true)
                        setProperty(d.options, "availableTargets", availableTargets);
                    }
                    return mainChosenTarget;
                })
            },
            buttons: {}, 
            default: "Heal selected"       
        }).render(true,{
            height: "auto",
            id:"MassCureWounds"
        })
    });
    return mainDialog
}
