                        /***************\
                        *      V 10     *
                        \***************/
/**************************************************************************************************\
- Hotbar script macro. Select a token and execute. Goes through all weapons and shields and equips 
main and off-hand.
- Changes action cost of off hand weapon, as well as damage mods to 5e rules. 
- Changes the damage to be versatile (must be set as Versatile in the item's details checkbox), 
if the player wants to use it as such a weapon. Shield is not selectable in this case.
- Checks if the following items are on the token and respects the corresponding 5e rules:
 Dual Wielder, Sharpshooter, "Fighting Style: Dueling", "Fighting Style: Two-Weapon Fighting".
\**************************************************************************************************/
let dualWielderFeatName = "" //You can put here the name of the Dual Wielder feat you use wrapped in"". If empty the macro will try to check for feature names on the actor.

actor = token?.actor ?? game.user.character;

if(!actor) {
    ui.notifications.warn(`${game.user.name} please at least select a token to use the Loadout`)
    return; 
}

let weaponsFlagged = actor.items.filter(function (i) {
    return i.getFlag('world', 'originalWeaponLoadout')
});
if (!!weaponsFlagged.length) await revertWeapons(weaponsFlagged);

await removeDualWieldingACbonus(actor)

let dualWielderFeat;
let sharpShooter = !!actor.items.getName("Sharpshooter");
//Dueling Fighting technique +2 when attacking one handed and no other weapon at off-hand
const dueler = !!actor.items.getName("Fighting Style: Dueling");
//Two Weapon Fighting technique +@mod when attacking with the off-hand
const twoWeaponFighter = !!actor.items.getName("Fighting Style: Two-Weapon Fighting");
// is the actor a Dual Wielder? can use non-light weapons
let dualWielderItem = actor.items.getName(dualWielderFeatName)
if (!dualWielderItem) {
    dualWielderFeat = !!(actor.items.getName("Dual Wielder") ?? actor.items.find(item=>item.name.includes("Dual Wield")));
    if (dualWielderFeat) dualWielderItem = actor.items.find(item=>item.name.includes("Dual Wield"))
}
else dualWielderFeat = true;

// is the actor using Shield?
const shieldItems = actor.itemTypes.equipment.filter(it=>it.system.armor?.type === "shield")

// gather the available weapons.
let weaponsInitial = actor.itemTypes.weapon.filter(weapon=>!!weapon.getRollData().item.quantity)

function plainComparing(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

weaponsInitial = weaponsInitial.sort((a,b) => {
    return plainComparing(a.name, b.name);
})

let content = initialDialogContent(weaponsInitial)
let weaponsSecondary; 
let tokenName = actor.token?.name || actor.getActiveTokens()[0].name
let title
let d
const mainDialog = await new Promise((resolve, reject) => {
    d = new Dialog({
        title: `Weapon Loadout for ${tokenName}`,
        content,
        render: (html) => {
            containerMain = document.querySelector('.mainWeaponImg');
            //$(".mainWeaponImg").css("padding": "1px","border": "0px","border-radius": "5px")
            clickMain = containerMain && containerMain.addEventListener('click', async function getMain(event) {
                target = event.target;
                if (target.nodeName!='IMG') d.render(true)
                if (target.nodeName == "IMG" && (mainWeaponID = target.getAttribute('id'))) {
                    mainChosenWeapon = actor.items.get(mainWeaponID)
                    chosenMainContent = await mainWeaponChosenDialogContent(mainChosenWeapon)
                    if (mainChosenWeapon.getRollData().item.properties.ver) {
                        chosenMainContent = chosenMainContent.replace(`</form>`,`
                        <label for="attackMod">Extra Damage mods:</label>
                        <input id="versatile" type="checkbox"></input>
                        <label for="versatile">Use as Versatile?</label>
                        </form>`)
                    }
                    if (dueler && !mainChosenWeapon.getRollData().item.properties.two) {
                        if (!mainChosenWeapon.getRollData().item.properties.ver) {
                        chosenMainContent = chosenMainContent.replace(`</form>`,`
                        <label for="attackMod">Extra Damage mods:</label>
                        <input id="dueling" type="checkbox"></input>
                        <label for="dueling">Dueling?</label>
                        </form>`)
                        }
                        else chosenMainContent = chosenMainContent.replace(`</form>`,`
                        <input id="dueling" type="checkbox"></input>
                        <label for="dueling">Dueling?</label>
                        </form>`)
                    }
                    if (mainChosenWeapon.getRollData().item.properties.two) {
                        d.data.content = chosenMainContent
                        d.render(true)
                    }
                    else {
                        let secondaryDialogContent = await getSecondaryDialogContent(mainChosenWeapon,chosenMainContent,false)
                        d.data.content = secondaryDialogContent[0]
                        d.render(true)
                    }
                }
                return mainChosenWeapon;
            })
            containerSecondary = document.querySelector('.secondaryWeaponImg');
           // $(".secondaryWeaponImg").css("padding": "1px","border": "0px","border-radius": "5px")
            clickSecondary = containerSecondary && containerSecondary.addEventListener('click', async function getSecondary(event) {
                target = event.target;
                if (target.nodeName!='IMG') d.render(true)
                if (target.nodeName == "IMG" && (secondaryWeaponID = target.getAttribute('id'))) {
                    secondaryChosenWeapon = actor.items.get(secondaryWeaponID)
                /*$(".itemSecondaryimg").click(async function(html){
                    //secondaryChosenId = $(this).find('.secondaryWeaponImg').attr('id');
                    secondaryChosenId = $(this).find('.itemSecondaryimg').attr('id');
                    secondaryChosenWeapon = actor.items.get(secondaryChosenId)*/
                    chosenSecondaryContent = d.data.content
                    getMainWeaponId = $(chosenSecondaryContent).find('.mainWeaponImg').attr('id')
                    dueling = chosenSecondaryContent.search('checked')
                    if (dueling === -1) dueling = false
                    else dueling = true
                    mainChosenWeapon = actor.items.get(getMainWeaponId)
                    ccc = await mainWeaponChosenDialogContent(mainChosenWeapon)
                    ccc = ccc.replace("Weapons available:", "Main Hand item:")
                    if (dueling) {
                        ccc = ccc.replace(`</form>`,`<input id="dueling" type="checkbox" checked></input>
                            <label for="dueling">Let's Duel!</label></div>
                            </form>`)
                        chosenInitialSecondaryContent = chosenSecondaryContent.split('</form>')[1]
                        chosenInitialSecondaryContent = chosenInitialSecondaryContent.replace('Items available','Secondary item chosen')
                        chosenSecondaryContent = chosenSecondaryContent.split('<p>Choose your off hand item.</p>')[0]
                        chosenSecondaryContent = chosenSecondaryContent.replace(chosenSecondaryContent,ccc)
                        chosenSecondaryContent += chosenInitialSecondaryContent
                        d.data.content = chosenSecondaryContent
                        d.render(true)
                    }
                    else {
                        chosenInitialSecondaryContent = await getSecondaryDialogContent(mainChosenWeapon,ccc,null,secondaryChosenWeapon)
                        d.data.content = chosenInitialSecondaryContent[0]
                        d.render(true)
                    }
                }
            })
            $("input#versatile").click(async function(html){
                versatile = html.originalEvent.path[0].checked
                versatileContent = d.data.content
                getMainWeaponId = document.querySelector('.mainWeaponImg').id
                getMainWeapon = actor.items.get(getMainWeaponId)
            
                if (versatile) {
                    let versatileDialogContent = await mainWeaponChosenDialogContent(getMainWeapon)
                    versatileDialogContent = await getSecondaryDialogContent(getMainWeapon,versatileContent,"versatile")
                    originalDialog = versatileDialogContent[1]
                    d.data.content = versatileDialogContent[0]
                    d.render(true)
                    setProperty(d.options, 'originalVersatileDialog', originalDialog)
                }
                else { //reset versatile checkbox
                    let versatileDialogContent = getProperty(d.options, 'originalVersatileDialog')
                    d.data.content = versatileDialogContent
                    d.render(true)
                }
                //return secondaryChosenWeapon
            })
            $("input#dueling").click(async function(html){
                dueling = html.originalEvent.path[0].checked;
                duelingContent = d.data.content
                getMainWeaponId = document.querySelector('.mainWeaponImg').id
                getMainWeapon = actor.items.get(getMainWeaponId)
                if (dueling) {
                    let duelingDialogContent =  await mainWeaponChosenDialogContent(getMainWeapon)
                    duelingDialogContent = await getSecondaryDialogContent(getMainWeapon,duelingContent,"dueling")
                    originalDialog = duelingDialogContent[1]
                    d.data.content = duelingDialogContent[0]
                    d.render(true)
                    setProperty(d.options, 'originalDuelingDialog', originalDialog)
                }
                else {
                    let duelingDialogContent = foundry.utils.getProperty(d.options, 'originalDuelingDialog')
                    d.data.content = duelingDialogContent
                    d.render(true)
                }
            })
        },
        buttons: {
            yes: {
                icon: "<i class='fas fa-check'></i>",
                label: "Accept Loadout!",
                callback: async (html) => { 
                    let weaponMain;
                    let weaponSecondary;
                    const weaponMainId = html[0].querySelector(".mainWeaponImg").id;
                    weaponMain = actor.items.get(weaponMainId)
                    const weaponSecondaryId = html[0].querySelector(".secondaryWeaponImg")?.id
                    if (weaponSecondaryId) weaponSecondary = actor.items.get(weaponSecondaryId)
                    const isVersatile = html[0].querySelector("#versatile")?.checked;
                    const isDueling = html[0].querySelector("#dueling")?.checked;
                    const results = [weaponMain,weaponSecondary,isVersatile,isDueling]
                    resolve(results);
                }
            },
            no:{
                icon: "<i class='fas fa-times'></i>",
                label: "Reset selection",
                callback: () => {
                    let contentReset = initialDialogContent(weaponsInitial)
                    d.data.content = contentReset
                    d.render(true)
                }
            }
        },
        default: "yes"        
        }).render(true,{
            width: "400",
            height: "auto",
            resizable: true,
            id:"Loadout"
    })
});
//console.log(d.data.content)
//console.log(d)

const results = await mainDialog;
const weaponMain = results[0];
if(!weaponMain) {
    ui.notifications.warn(`${game.user.name} you didn't choose any weapon for you main hand (loadout aborted) :(`)
    return;
}
const weaponSecondary = results[1] ? results[1] : false;
const isVersatile = results[2] ? true : false;
const isDueling = results[3] ? true : false;
let updates = []
updates = await changeWeapons(weaponMain,weaponSecondary)
updates = updates.concat(actor.items.filter(i => i.name !== weaponMain.name && i.name !== weaponSecondary?.name).filter(i=> i.type==="weapon" || i.getRollData().item.armor?.type === "shield").map(i=> {
    return { '_id':i.id, 'system.equipped':false }}))
await actor.updateEmbeddedDocuments("Item", updates)

if (weaponSecondary?.type === "weapon" && !!dualWielderFeat) { 
    await applyDualWieldingACbonus(actor);    
}

if (!weaponsSecondary?.type === "weapon") {
    await removeDualWieldingACbonus(actor); 
}

//FUNCTIONS
async function applyDualWieldingACbonus(actor) {
    const effectData = {
        "changes":[
            { "key": "system.attributes.ac.bonus", "mode": CONST.ACTIVE_EFFECT_MODES.ADD, "value": "+1", "priority": "20" }
        ],
        "disabled": false,
        "duration": {
            "startTime": game.time.worldTime,
        },
        "icon": "icons/skills/melee/weapons-crossed-swords-yellow-teal.webp",
        "label": "Dual Wielder AC boost",
        "tint": "",
        "transfer": false,
        "flags": {
            "world": { "dualWielderFeat": true }
        },
        "origin": `${token.actor.uuid}+.+${dualWielderItem.id}`
    }
    await actor.createEmbeddedDocuments("ActiveEffect", [effectData])
}

async function removeDualWieldingACbonus(actor) {
    await actor.effects.find(eff=>eff.label === "Dual Wielder AC boost")?.delete()
}

async function revertWeapons(weapons) {
    let originalWeaponName;
    let originalWeaponDamage;
    let updateparts=[];
    let weaponsTodeleteIDs = weapons.filter(i=>i.flags.world?.originalWeaponLoadout?.originalWeaponId).map(i=>i.id)
    let originalWeaponId1;
    let originalWeaponId2;
    if (!!weaponsTodeleteIDs.length) {
        if (weaponsTodeleteIDs.length > 1) {
            originalWeaponId1 = weapons[0].getFlag('world','originalWeaponLoadout.originalWeaponId');
            originalWeaponId2 = weapons[1].getFlag('world','originalWeaponLoadout.originalWeaponId');
            if (originalWeaponId1 === originalWeaponId2) {
                let originalWeapon = actor.items.get(originalWeaponId1)
                await originalWeapon.update({"system.quantity":originalWeapon.getRollData().item.quantity + 2})
                await actor.deleteEmbeddedDocuments("Item",[weapons[0].id,weapons[1].id]);
                return;
            }
            else {
                let originalWeapon1quantity = actor.items.get(originalWeaponId1)?.getRollData().item.quantity;
                let originalWeapon2quantity = actor.items.get(originalWeaponId2)?.getRollData().item.quantity;
                updateparts = [{'_id':originalWeaponId1,'system.quantity': originalWeapon1quantity + 1},{'_id':originalWeaponId2,'system.quantity': originalWeapon2quantity + 1}]
                await actor.updateEmbeddedDocument("Item",updateparts);
                await actor.deleteEmbeddedDocuments("Item", [weapons[0].id,weapons[1].id]);
            }
        }
        else if (weaponsTodeleteIDs.length === 1){
            let originalWeaponId = weapons[0]?.getFlag('world','originalWeaponLoadout.originalWeaponId') ? weapons[0].getFlag('world','originalWeaponLoadout.originalWeaponId') : weapons[1].getFlag('world','originalWeaponLoadout.originalWeaponId');
            let originalWeaponQuantity = actor.items.get(originalWeaponId)?.getRollData().item.quantity;
            updateparts = [{'_id':originalWeaponId, 'system.quantity': originalWeaponQuantity + 1}];
            if(weapons[0]?.getFlag('world','originalWeaponLoadout.originalWeaponId')) {
                await weapons[0].delete();
                weapons = weapons[1]
            }
            else {
                await weapons[1]?.delete();
                weapons = weapons[0];
            }
        }
    }
    if(!weapons) return await actor.updateEmbeddedDocuments("Item",updateparts)
    if (!Array.from(weapons).length) {
        updateparts = updateparts.concat(weapons.getFlag('world','originalWeaponLoadout.updateWeapon'));
        foundry.utils.setProperty(updateparts[1],'flags.world.-=originalWeaponLoadout',null)
    }
    else if (weapons.length === 1) {
        if (!updateparts.length) {
            updateparts = [weapons[0].getFlag('world','originalWeaponLoadout.updateWeapon')]
            foundry.utils.setProperty(updateparts[0],'flags.world.-=originalWeaponLoadout',null)
        }
        else {
        updateparts = updateparts.concat(weapons[0].getFlag('world','originalWeaponLoadout.updateWeapon'))//.concat('"flags.world.-=originalWeaponLoadout":null')]
        foundry.utils.setProperty(updateparts[1],'flags.world.-=originalWeaponLoadout',null)
        }
    }
    else {
        updateparts = weapons[0].getFlag('world','originalWeaponLoadout.updateWeapon')
        updateparts = [updateparts].concat(weapons[1].getFlag('world','originalWeaponLoadout.updateWeapon')).concat([{'_id':weapons[0].id,'flags.world.-=originalWeaponLoadout':null},{'_id':weapons[1].id,'flags.world.-=originalWeaponLoadout':null}])
    }
    let newweaponData = await actor.updateEmbeddedDocuments("Item", updateparts)
}

async function changeWeapons(weaponM,weaponS) {  //@to-do: thrown weapons. If weaponM = weaponS check quantity? 
    let updateM;
    let updateS;
    let updateFinal;

//Main weapon    
    let { item: {quantity:quantityM, properties:propertiesM, range:rangeM, actionType:actionTypeM, damage: damageM}} = weaponM.getRollData();  
   
//Secondary weapon
    let damageS;
    let quantityS;
    let propertiesS;
    let rangeS;
    let actionTypeS;
    let activationS;
    if (weaponS){ 
        damageS = weaponS.getRollData().item.damage;
        quantityS = weaponS.getRollData().item.quantity;
        propertiesS = weaponS.getRollData().item.properties;
        rangeS = weaponS.getRollData().item.range;
        actionTypeS = weaponS.getRollData().item.actionType;
        activationS = weaponS.getRollData().item.activation;
    }

    if (quantityM > 1 && !weaponS) {
        let newId = await splitWeapon(weaponM.id,"main");
        weaponM = actor.items.get(newId[0]);
        updateFinal = [newId[1]];
    }
    else if (quantityM > 1 && quantityS === 1) {
        let newId = await splitWeapon(weaponM.id,"main");
        weaponM = actor.items.get(newId[0]);
        updateFinal = [newId[1]];
    }
    else if (weaponS && (quantityS > 1 && quantityM === 1 )) {
        let newId = await splitWeapon(weaponS.id,"off");
        weaponS = actor.items.get(newId[0]);
        updateFinal = [newId[1]]
    }
    else if (quantityM > 1 && quantityS > 1) {  //both quantities > 1
        let newId = await splitWeapon(weaponM.id,"both");
        weaponM = actor.items.get(newId[0]);
        if (weaponS) weaponS = actor.items.get(newId[1]);
        updateFinal = [newId[2]];
    }
    let mainFlag = {'originalWeaponLoadout': { 'updateWeapon':{ '_id': weaponM.id, 'name':weaponM.name,  'system.damage':damageM, 'system.range':rangeM, 'system.actionType': actionTypeM } } }; 
    let secondaryFlag;
    if (weaponS) secondaryFlag = {'originalWeaponLoadout': { 'updateWeapon': { '_id': weaponS.id, 'name':weaponS.name, 'system.damage':damageS, 'system.range':rangeS, 'system.activation': activationS } } };
    if (weaponM) {
//mwak - 2-Handed weapons or Main weapon that is not to be used as versatile or under dueling feature.
        if (propertiesM.two && !isVersatile && actionTypeM !== "rwak"|| actionTypeM !== "rwak" && !isDueling && !isVersatile || actionTypeM === "rwak" && !sharpShooter) {
            updateM = { '_id': weaponM.id, 'name': `(main) ${weaponM.name}`, 'flags.world': mainFlag, 'system.equipped': true }
        }
//rwak - 2-handed weapons like bows, (with and without sharpshooter feat)
        else if (actionTypeM === "rwak" && sharpShooter) {
            let newRangeM = weaponM.getRollData().item.range
            newRangeM.value = newRangeM.long
            newRangeM.long = ""
            updateM = { '_id': weaponM.id, 'name': `(main) ${weaponM.name}`, 'flags.world': mainFlag, 'system.range': newRangeM, 'system.equipped': true }
        }
//Versatile weapons
        else if (isVersatile) {
            let newDamage = weaponM.getRollData().item.damage;
            newDamage.parts[0][0] = newDamage.versatile;
            newDamage.versatile = "";
            if(!!damageM.versatile) {
                updateM = { '_id': weaponM.id, 'name': `(vers) ${weaponM.name}`, 'flags.world': mainFlag, 'system.damage':newDamage, 'system.equipped': true }
            }
            else {  //to-do check if that is needed and make sure its not!
                ui.notifications.warn("You selected Versatile loadout, but the weapon has no versatile damage defined")
                updateM = {  '_id': weaponM.id, 'name': `(vers) ${weaponM.name}`, 'flags.world': mainFlag, 'system.equipped': true }
            }
        }
//Dueling
        else if (isDueling) {
            let newDamage = weaponM.getRollData().item.damage
            newDamage.parts[0][0] = newDamage.parts[0][0].replace('@mod','2 + @mod')
            updateM = {  '_id': weaponM.id, 'name': `(main) ${weaponM.name}`, 'flags.world': mainFlag, 'system.damage':newDamage, 'system.equipped':true }
        }
    }   
    if (weaponS) {
//Take care of shields first
        if(weaponS.type === "equipment" ) {
            updateS = {  '_id': weaponS.id, 'system.equipped':true }
        }
        else {
            let newActivationTypeS = weaponS.getRollData().item.activation;
            newActivationTypeS.type = 'bonus'
            if(!twoWeaponFighter) {
                let newDamage = weaponS.getRollData().item.damage;
                newDamage.parts[0][0] = newDamage.parts[0][0].replace('@mod','')    //@to-do: If ability mod is negative it should be added though! hmmm...
                updateS = {  '_id': weaponS.id, 'name': `(off-hand) ${weaponS.name}`, 'flags.world': secondaryFlag, 'system.damage':newDamage, 'system.activation':newActivationTypeS, 'system.equipped':true }
            }
            else {
                updateS = {  '_id': weaponS.id, 'name': `(off-hand) ${weaponS.name}`, 'flags.world': secondaryFlag, 'system.activation':newActivationTypeS, 'system.equipped':true }
            }
        }
    }
    let returns 
    if (weaponS) returns = [updateM,updateS];
    else returns = [updateM]
    if (!!updateFinal) returns=returns.concat(updateFinal)
    return returns;
}

async function splitWeapon(weaponId, hand) {
    let returns;
    if(hand!=="both") {
        const origWeapon = actor.items.get(weaponId);
        let newWeapon = origWeapon.toObject(); //@to-do: Does the change work? Before it was: let newWeapon = origWeapon.data.toObject(); 
        if (newWeapon.flags.world) foundry.utils.mergeObject(newWeapon.flags.world, {'originalWeaponLoadout': {'originalWeaponId':origWeapon.id}});
        else newWeapon.flags.world = {'originalWeaponLoadout': {'originalWeaponId':origWeapon.id}};
        newWeapon.system.quantity = 1;
        if (origWeapon.getRollData().item.actionType === "rwak") {
            newWeapon.system.consume = {
                "type": "ammo",
                "target": origWeapon.id,
                "amount": 1,
            }
        }
        let newItems = await actor.createEmbeddedDocuments("Item",[newWeapon]);
        returns = [newItems[0].id, {'_id':origWeapon.id, 'system.equipped':false, 'system.quantity':origWeapon.getRollData().item.quantity - 1}]
        return returns;
    }  
    else {   //(hand==="both")
        const origWeapon = actor.items.get(weaponId);
        let newWeaponM = origWeapon.toObject();
        newWeaponM.system.quantity = 1;
        let newWeaponS = origWeapon.toObject();
        newWeaponS.system.quantity = 1;
        if (origWeapon.getRollData().item.actionType === "rwak") {
            newWeaponM.system.consume = {
                "type": "ammo",
                "target": origWeapon.id,
                "amount": 1,
            }
            newWeaponS.system.consume = {
                "type": "ammo",
                "target": origWeapon.id,
                "amount": 1,
            }
        }
        if (newWeaponM.flags.world) foundry.utils.mergeObject(newWeaponM.flags.world, {'originalWeaponLoadout': {'originalWeaponId':origWeapon.id}});
        else newWeaponM.flags.world = {'originalWeaponLoadout': {'originalWeaponId':origWeapon.id}};
        if (newWeaponS.flags.world) foundry.utils.mergeObject(newWeaponS.flags.world, {'originalWeaponLoadout': {'originalWeaponId':origWeapon.id}});
        else newWeaponS.flags.world = {'originalWeaponLoadout': {'originalWeaponId':origWeapon.id}};
        let newItems = await actor.createEmbeddedDocuments("Item",[newWeaponM,newWeaponS]);
        returns = [newItems[0].id, newItems[1].id, {'_id':origWeapon.id, 'system.equipped':false, 'system.quantity':origWeapon.getRollData().item.quantity - 2}]
        return returns;
    }
}

function initialDialogContent(weapons) {
  let initialWeaponsContent = weapons.reduce((acc, weapon) => acc += `<img width="36" height="36" src="${weapon?.img}" title="${weapon.name}" id="${weapon.id}"/>`,``);
  let content = `
    <p>Choose main hand weapon.</p>
    <hr>
    <form>  
    <div class="form-group">
    <label for="type">Weapons available:</label>
      <div class="form-fields"><center>
     <div class="mainWeaponImages"><a class="mainWeaponImg">${initialWeaponsContent}</a></div>
      </center></div>
    </div>
  </form>
  `
return(content);
}
//<center style="width: ${Math.ceil(weapons.length/7)*40}px"></center>
async function mainWeaponChosenDialogContent(mainChosenWeapon) {
    let content = `
    <p>Selected main hand weapon.</p>
    <hr>
    <form>  
    <div class="form-group">
    <label for="type">Weapon Selected:</label>
      <div class="form-fields"><center style="width: 40px">
     <div class="mainWeaponImages"><a class="mainWeaponImg" id="${mainChosenWeapon.id}"><img height="36" src="${mainChosenWeapon?.img}" title="${mainChosenWeapon.name}" id="${mainChosenWeapon.id}"/></a></div>
      </center></div>
    </div>
  </form>
  `
return(content);
}


async function getSecondaryDialogContent(mainWeapon,content,damageOptions,secondaryWeapon) {
    if (secondaryWeapon) {   //if a secondary is already provided do the dialog rerendering
        let secondaryDialogContent = `
            <p>Choose your off hand item.</p>
            <hr>
            <form>  
            <div class="form-group">
            <label for="type">Secondary Item selected:</label>
            <div class="form-fields"><center style="width: 40px">
            <div class="secondaryWeaponImages"><a class="secondaryWeaponImg" id="${secondaryWeapon.id}">
                <img height="36" src="${secondaryWeapon?.img}" title="${secondaryWeapon.name}" id="${secondaryWeapon.id}"/></a></div>
            </center></div>
            </div>
            </form>
        `
        let secondaryDialogInitialContent = content
        content += secondaryDialogContent
        let returns = [content, secondaryDialogInitialContent]
        return returns;
    }
    if (!damageOptions) {    //if no damageOptions (versatile or dueling selected)
        if (mainWeapon.getRollData().item.properties.two) return content;
        else if (!mainWeapon.getRollData().item.properties.two && !dualWielderFeat) {
            weaponsSecondary = actor.itemTypes.weapon.filter(i => i.getRollData().item.properties.lgt).filter(i => !i.getRollData().item.properties.two) //if not Dual Wielder only Light Weapons
        }
        else {
            weaponsSecondary = actor.itemTypes.weapon.filter(i => !i.getRollData().item.properties.two)   //check to ensure no two handed weapon is in secondaries
        }
       // if (mainWeapon.getRollData().item.quantity <=1) weaponsSecondary=weaponsSecondary.filter(i=>i.name !== mainWeapon.name)
        if (mainWeapon.getRollData().item.quantity <=1) weaponsSecondary=weaponsSecondary.filter(i=>i.id !== mainWeapon.id)
        if (!!shieldItems.length) {   //if there are shields on the inventory, put them in the secondary available
            for (let shieldItem of shieldItems) {
                weaponsSecondary = weaponsSecondary.concat(shieldItem)
            }
        }
    }
    else if (damageOptions) {  //if versatile or dueling is selected.
        if (damageOptions === "versatile") {
            let versatileContent = await mainWeaponChosenDialogContent(mainChosenWeapon)
            versatileContent = versatileContent.replace(`</form>`, `<div class="versatile">
            <input id="versatile" type="checkbox" checked></input>
            <label for="dueling">Versatile!</label></div>
            </form>`)
            let returns = [versatileContent,content]
            return returns;
        }
        else if (damageOptions === "dueling") {
            let duelingContent = await mainWeaponChosenDialogContent(mainChosenWeapon)
            duelingContent = duelingContent.replace(`</form>`,`
                    <div class="dueling">
                    <input id="dueling" type="checkbox" checked></input>
                    <label for="dueling">Dueling?!</label></div>
                    </form>`)
            if (!!shieldItems.length) {
                weaponsSecondary=[]
              for (let shieldItem of shieldItems) {
                  weaponsSecondary = weaponsSecondary.concat(shieldItem)
              }
              weaponsSecondary = weaponsSecondary.reduce((acc, weapon) => acc += `<img class="secondaryWeaponImg" height="36" src="${weapon?.img}" title="${weapon.name}" id="${weapon.id}"/>`,``);
              let secondaryDialogContent = `
                <p>Choose your off hand item.</p>
                <hr>
                <form>  
                  <div class="form-group">
                      <label for="type">Items available:</label>
                    <div class="form-fields"><center>
                    ${weaponsSecondary}
                    </center></div>
                  </div>
                </form>
                  `
               duelingContent += secondaryDialogContent
               let returns = [duelingContent,content]
               return returns;
            }
            else {
                let returns = [duelingContent,content]
                return returns;
            }
        }
    }
    weaponsSecondary = weaponsSecondary.reduce((acc, weapon) => acc += `<img height="36" src="${weapon?.img}" title="${weapon.name}" id="${weapon.id}"/>`,``);
    let secondaryDialogContent = `
      <p>Choose your off hand item.</p>
      <hr>
      <form>  
        <div class="form-group">
        <label for="type">Items available:</label>
          <div class="form-fields"><center><a class="secondaryWeaponImg">
          ${weaponsSecondary}
          </a></center></div>
        </div>
      </form>
    `;
    let secondaryDialogInitialContent = content;
    content += secondaryDialogContent;
    let returns = [content ,secondaryDialogInitialContent];
    return returns;
}
