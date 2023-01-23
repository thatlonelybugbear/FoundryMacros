// This macro will create a Dialog which lets you choose up to 3 friendly creatures within 30ft of caster (excluding caster) and heal them using a specific HP pool.

//The HP pool can be predefined using the value in the 1st line or be the MidiQOL calculated appliedDamage from the attack, if you use this as an Item onUse macro, After Active Effects on the same attack item.


const healingValuePredef = 20; //default healingPool value or use the healingPool value from the MidiQOL damageList as shown below.
const healingPool = args[0]?.damageList[0]?.appliedDamage ?? healingValuePredef;
game.sliderHealing = [];

let initialTargets = getValidTargets(token, 1, 30); //needs MidiQOLto get the distances. Can change to another available function for that.
let initialContent = initialDialogContent(initialTargets)
let dialogInitial = await targetingDialog(initialContent, initialTargets, `${healingPool}`)

function getValidTargets(token, disposition = null, radius, maxSize = undefined) {
    return MidiQOL.findNearby(disposition, token, radius, maxSize).filter(tok=>tok.actor.system.attributes.hp.value < tok.actor.system.attributes.hp.max)
}

function initialDialogContent(targets) {
    let initialTargets = targets.reduce((acc, target) => acc += `<img width="36" height="36" src="${target?.document.texture.src}" title="${target.name}" id="${target.id}"/>`,``);
    let content = `<center><b>Healing Pool:</b> ${healingPool}</center><hr><form><div class="form-group"><label for="type">Targets available:</label><div class="form-fields"><center><div class="mainTargetImages"><a class="mainTargetImg">${initialTargets}</a></div></center></div></div></form>`
    return(content);
}
function targetSelectedContent({lock, slider, id, value, lockedTargets, dialogContent, specificContent, availableTargets}) {
    if (!slider && lock && id && value >= 0 && specificContent && dialogContent) {
        let content
        let target = game.sliderHealing.find(t=>t.id===checkedId);
        const missingHPs = target.actor.system.attributes.hp.max - target.actor.system.attributes.hp.value; 
        if (checked) {
            const searchString = specificContent;
            const replaceString = `<center>${target.name} is going to be healed for:<div class="form-group"><input type="number" value="${hpLocked}" class="${target.name}" name="slider-${target.id}" disabled><label align="right">Locked HP</label><input type="checkbox" checked name="lock-${target.id}:${hpLocked}" id="checkbox"></div></center>`
        content = dialogContent.replace(searchString,replaceString)
        }
        else {
            let searchString = dialogContent.split(`<form name="${target.name}">`)[1].split(`</form name="${target.name}">`)[0];
            let replaceString = specificContent;
            content = dialogContent.replace(searchString,replaceString)
        }
        return content;
    }
    let content;
    let selectedTargets = game.sliderHealing.reduce((acc, target) => acc += `<img width="36" height="36" src="${target?.document.texture.src}" title="${target.name}" id="${target.id}"/>`,``);
    if (!lock && !slider) {
        content = dialogContent;
        if (game.sliderHealing.length < 3 && initialTargets.filter(tok=>!game.sliderHealing.includes(tok)).length > 0) {
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
            let replaceString = `<center><b>Healing Pool:</b> ${healingPool}</center><hr><form><div class="form-group"><label for="type">Targets selected:</label><div class="form-fields"><center><div class="selectedTargetImages"><a class="selectedTargetImg">${selectedTargets}</a></div></center></div></div></form>`
            content = dialogContent.replace(searchString, replaceString);
        }
    }
    let availableHpPerTarget = [];
    let neededHpPerTarget = [];
    let remainingHealingPool = healingPool
    if (lockedTargets?.length) {
        for (let l of lockedTargets) remainingHealingPool -= Number(l[1])
    }
    let neededHealing=0;
    for (let target of game.sliderHealing) {
        let {max, value} = target?.actor?.system.attributes.hp ?? {};
        let missingHp = max - value;
        neededHealing += missingHp
        neededHpPerTarget.push([target.id,missingHp])
    }
    //@no slider change
    if (!slider && !lock) {
        for (let target of game.sliderHealing) {
            let searchString;
            if (neededHealing <= healingPool) {
                availableHpPerTarget.push([target.id,neededHpPerTarget.find(i=>i[0]===target.id)[1]])
            }                
            else {
                availableHpPerTarget.push([target.id,Math.min(remainingHealingPool,neededHpPerTarget.find(i=>i[0]===target.id)[1])]);
            }
            let ttk = neededHpPerTarget.find(key => key[0] === target.id)[1]
            remainingHealingPool = remainingHealingPool - availableHpPerTarget.find(i=>i[0]===target.id)[1] 
            const maxValue = Math.min(neededHpPerTarget.find(i=>i[0]===id)[1], healingPool)
            if (content.split(`<form name="${target.name}">`)[1]?.split(`</form name="${target.name}">`)[0]?.length) {
                searchString = dialogContent.split(`<form name="${target.name}">`)[1].split(`</form name="${target.name}">`)[0];
                let replaceString = `<center>${target.name} is missing ${ttk} HPs. Heal for ${availableHpPerTarget.find(i=>i[0]===target.id)[1]}.<div class="form-group"><input type="range" min="0" max="${maxValue}" value="${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" class="${target.name}" name="slider-${target.id}"><label align="right">Lock HP?</label><input type="checkbox" name="lock-${target.id}:${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" id="checkbox"></div></center>`
                content = content.replace(searchString, replaceString);
            }
            else content += `<form name="${target.name}"><center>${target.name} is missing ${ttk} HPs. Heal for ${availableHpPerTarget.find(i=>i[0]===target.id)[1]}.<div class="form-group"><input type="range" min="0" max="${maxValue}" value="${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" class="${target.name}" name="slider-${target.id}"><label align="right">Lock HP?</label><input type="checkbox" name="lock-${target.id}:${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" id="checkbox"></div></center></form name="${target.name}">`
        }
        return content
    }
    //@slider change
    else if (slider && !lockedTargets?.length){
        content = dialogContent;
        remainingHealingPool = healingPool - value;
        let predefTarget = game.sliderHealing.find(t=>t.id===id);
        for (let target of game.sliderHealing) {
            let searchString = content.split(`<form name="${target.name}">`)[1].split(`</form name="${target.name}">`)[0];
            if (target === predefTarget) {
                if (neededHealing <= healingPool) availableHpPerTarget.push([target.id,neededHpPerTarget.find(i=>i[0]===target.id)[1]]);
                else availableHpPerTarget.push([target.id,value]);
            }
            else {
                if (neededHealing <= healingPool) availableHpPerTarget.push([target.id,neededHpPerTarget.find(i=>i[0]===target.id)[1]]);
                else availableHpPerTarget.push([target.id,Math.min(remainingHealingPool,neededHpPerTarget.find(i=>i[0]===target.id)[1])]);
                remainingHealingPool = remainingHealingPool - availableHpPerTarget.find(i=>i[0]===target.id)[1] 
            }
            //
            let ttk = neededHpPerTarget.find(key => key[0] === target.id)[1]
            const maxValue = Math.min(neededHpPerTarget.find(i=>i[0]===target.id)[1], healingPool)
            let replaceString = `<center>${target.name} is missing ${ttk} HPs. Heal for ${availableHpPerTarget.find(i=>i[0]===target.id)[1]}.<div class="form-group"><input type="range" min="0" max="${maxValue}" value="${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" class="${target.name}" name="slider-${target.id}"><label align="right">Lock HP?</label><input type="checkbox" name="lock-${target.id}:${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" id="checkbox" hp="${availableHpPerTarget.find(i=>i[0]===target.id)[1]}"></div></center>`
            content = content.replace(searchString, replaceString);
        }
    }
    else if (slider && lockedTargets?.length) {
        content = dialogContent;
        let lockedHp = 0;
        for (let l of lockedTargets) {
           lockedHp = Number(lockedHp) + Number(l[1]);
        }     
        remainingHealingPool = Math.max(healingPool - value - lockedHp,0);
        let predefTarget = game.sliderHealing.find(t=>t.id===id);
        let lockTargets = lockedTargets.map(t=>game.sliderHealing.find(i=>i.id===t[0]));
        for (let target of game.sliderHealing) {
            let searchString = dialogContent.split(`<form name="${target.name}">`)[1].split(`</form name="${target.name}">`)[0];
            let ttk = neededHpPerTarget.find(key => key[0] === target.id)[1]
            const maxValue = Math.min(neededHpPerTarget.find(i=>i[0]===target.id)[1], healingPool-lockedHp)
            if (target === predefTarget) {
                if (neededHealing <= healingPool) availableHpPerTarget.push([target.id,neededHpPerTarget.find(i=>i[0]===target.id)[1]]);
                else availableHpPerTarget.push([target.id,value]);
                let replaceString = `<center>${target.name} is missing ${ttk} HPs. Heal for ${availableHpPerTarget.find(i=>i[0]===target.id)[1]}.<div class="form-group"><input type="range" min="0" max="${maxValue}" value="${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" class="${target.name}" name="slider-${target.id}"><label align="right">Lock HP?</label><input type="checkbox" name="lock-${target.id}:${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" id="checkbox"></div>`
                content = content.replace(searchString,replaceString);
            }
            else if (lockTargets.find(t=>t.id===target.id)) {
                let hpLocked = lockedTargets.find(t=>t[0]===target.id)[1];
                let replaceString = `<center>${target.name} is going to be healed for:<div class="form-group"><input type="number" value="${hpLocked}" class="${target.name}" name="slider-${target.id}" disabled><label align="right">Locked HP</label><input type="checkbox" checked name="lock-${target.id}:${hpLocked}" id="checkbox"></div></center>`
                content = content.replace(searchString,replaceString);
            }
            else {
                if (neededHealing <= healingPool) availableHpPerTarget.push([target.id,neededHpPerTarget.find(i=>i[0]===target.id)[1]]);
                else availableHpPerTarget.push([target.id,Math.min(remainingHealingPool,neededHpPerTarget.find(i=>i[0]===target.id)[1])]);
                remainingHealingPool = remainingHealingPool - availableHpPerTarget.find(i=>i[0]===target.id)[1]
                let replaceString = `<center>${target.name} is missing ${ttk} HPs. Heal for ${availableHpPerTarget.find(i=>i[0]===target.id)[1]}.<div class="form-group"><input type="range" min="0" max="${maxValue}" value="${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" class="${target.name}" name="slider-${target.id}"><label align="right">Lock HP?</label><input type="checkbox" name="lock-${target.id}:${availableHpPerTarget.find(i=>i[0]===target.id)[1]}" id="checkbox"></div></center>`
                content = content.replace(searchString,replaceString);
            }
        }
    }
    return content;
}   

// Dialog for choosing targets
async function targetingDialog(content, initialTargets, healingPool) {
    let d
    const mainDialog = await new Promise((resolve, reject) => {
        d = new Dialog({
            title: `Choose up to 3 creatures to heal`,
            content,
            render: (html) => {
                lockedTargets = getProperty(d.options, "lockedTargets") ?? [];
                availableTargets = getProperty(d.options, "availableTargets") ?? [];
                containerMain = document.querySelector('.mainTargetImg');
                clickMain = containerMain && containerMain.addEventListener('click', async function getMain(event) {
                    target = event.target;
                    if (target.nodeName!='IMG') d.render(true)
                    if (target.nodeName == "IMG" && (mainTargetID = target.getAttribute('id'))) {
                        mainChosenTarget = canvas.tokens.get(mainTargetID)
                        game.sliderHealing.push(mainChosenTarget)
                        availableTargets = initialTargets.filter(tok=>!game.sliderHealing.includes(tok))
                        chosenMainContent = targetSelectedContent({lock:false,slider:false,id:mainTargetID,availableTargets:availableTargets,dialogContent:d.data.content,lockedTargets:lockedTargets})
                        buttons = [{label: "Heal selected", callback: async (html) => {
                            let targetIds = Array.from([html[0].querySelector(".selectedTargetImg")][0].children).map(i=>i.id);
                            let results=[];
                            for (let targetId of targetIds) {
                                let target = canvas.tokens.get(targetId);
                                await MidiQOL.applyTokenDamage([{type:"healing", damage:`${html.find(`[name=slider-${targetId}]`).val()}`}], `${html.find(`[name=slider-${targetId}]`).val()}`, new Set([target]), null, new Set(), {})
                                results.push(target);
                            }
                            resolve(results)
                        }},{label: "Reset selected", callback: (html) => {
                            game.sliderHealing=[]
                            let contentNew = initialDialogContent(getValidTargets(token, 1, 30))
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
            //@Slider
                containerSlider = html.find('input[type=range]').change(async function(event){
                    target = event.target;
                    if (target.nodeName == "INPUT") { 
                        predef = target.value //@predef is the value of the slider
                        predefId = target.name.split('-')[1] //@predefId is the id of the target
                        lockedTargets = [];
                        checkedBoxes = html[0].querySelectorAll("#checkbox").forEach(element => {    
                            if (!!element.checked) {
                                lockedTargets.push([element.name.split('-')[1].split(":")[0],element.name.split('-')[1].split(":")[1]])
                            }
                        });
                        lockedHp = 0;
                        for (l of lockedTargets) lockedHp += Number(l[1])
                        //predef = healingPool-lockedHp
                        tt = canvas.tokens.get(predefId)?.actor?.system.attributes.hp;
                        missingHp = tt.max - tt.value;
                        maximum = Math.min(healingPool-lockedHp,missingHp)
                        predef = Math.clamped(predef,0,maximum)
                        newerContent = targetSelectedContent({slider:true,id:predefId,value:predef,availableTargets:availableTargets,lockedTargets:lockedTargets,dialogContent:d.data.content})
                        d.data.content = newerContent
                        d.render(true)
                }})
            //@Checkbox
                containerCheckbox = html.find('input[type=checkbox]').click(async function(event){
                    target = event.target;
                    if (target.nodeName == "INPUT") {
                        checkedId = target.name.split('-')[1].split(":")[0]
                        checked = target.checked
                        hpLocked = Number(target.name.split('-')[1].split(":")[1]);
                        if (checked) {
                            initialContent = d.data.content
                            targetToken = canvas.tokens.get(checkedId)
                            lockedTargets.push(targetToken)
                            initialContent = initialContent.split(`<form name="${targetToken.name}">`)[1].split(`</form name="${targetToken.name}">`)[0]
                            checkedContent = targetSelectedContent({lock:true,id:checkedId,value:hpLocked,specificContent:initialContent,dialogContent:d.data.content})
                            d.data.content = checkedContent
                            setProperty(d.options,"lockedTargets",lockedTargets)
                            d.render(true)
                            setProperty(d.options,checkedId,initialContent)
                            
                        }
                        else {
                            savedContent = getProperty(d.options,checkedId)
                            uncheckedContent = targetSelectedContent({lock:true,id:checkedId,value:hpLocked,specificContent:savedContent,dialogContent:d.data.content})
                            newTargets = lockedTargets.filter(tok=>tok !== canvas.tokens.get(checkedId))
                            lockedTargets = newTargets
                            setProperty(d.options,"lockedTargets",lockedTargets)
                            d.data.content = uncheckedContent
                            d.render(true)
                            
                        }
                    }
                })
            },
            buttons: {}, 
            default: "Heal selected"       
            }).render(true,{
                width: "auto",
                height: "auto",
                resizable: true,
                id:"HealingSliders"
        })
    });
    return mainDialog
}
