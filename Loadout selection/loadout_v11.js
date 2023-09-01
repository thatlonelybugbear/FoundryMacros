                        /***************\
                        *      V 11     *
                        \***************/
/**************************************************************************************************\
- Hotbar script macro. Select a token and execute. Goes through all weapons and shields and equips 
main and off-hand.
- Changes action cost of off hand weapon, as well as damage mods to 5e rules. 
- Changes the damage to be versatile (must be set as Versatile in the item's details checkbox), 
if the player wants to use it as such a weapon. Shield is not selectable in this case.
- Checks if the following items are on the actor and respects the corresponding 5e rules:
 Dual Wielder, Sharpshooter, "Fighting Style: Dueling", "Fighting Style: Two-Weapon Fighting".
\**************************************************************************************************/
let dualWielderFeatName = ''; //You can put here the name of the Dual Wielder feat you use wrapped in"". If empty the macro will try to check for feature names on the actor.

actor = token?.actor ?? game.user.character;

if (!actor) {
    return ui.notifications.warn(
        `${game.user.name} please at least select a token to use the Loadout`
    );
}

let weaponsFlagged = actor.items.filter(function (i) {
    return i.getFlag('world', 'originalWeaponLoadout');
});
if (!!weaponsFlagged.length) await revertWeapons(weaponsFlagged);

await removeDualWieldingACbonus(actor);

let dualWielderFeat;
let sharpShooter = !!actor.items.getName('Sharpshooter');
//Dueling Fighting technique +2 when attacking one handed and no other weapon at off-hand
const dueler = !!actor.items.getName('Fighting Style: Dueling');
//Two Weapon Fighting technique +@mod when attacking with the off-hand
const twoWeaponFighter = !!actor.items.getName(
    'Fighting Style: Two-Weapon Fighting'
);
// is the actor a Dual Wielder? can use non-light weapons
let dualWielderItem = actor.items.getName(dualWielderFeatName);
if (!dualWielderItem) {
    dualWielderFeat = !!(
        actor.items.getName('Dual Wielder') ??
        actor.items.find((item) => item.name.includes('Dual Wield'))
    );
    if (dualWielderFeat)
        dualWielderItem = actor.items.find((item) =>
            item.name.includes('Dual Wield')
        );
} else dualWielderFeat = true;

// is the actor using Shield?
const shieldItems = actor.itemTypes.equipment.filter(
    (it) => it.system.armor?.type === 'shield'
);

// gather the available weapons.
let weaponsInitial = actor.itemTypes.weapon.filter(
    (weapon) => !!weapon.system.quantity
);

function plainComparing(a, b) {
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

weaponsInitial = weaponsInitial.sort((a, b) => {
    return plainComparing(a.name, b.name);
});

let content = initialDialogContent(weaponsInitial);
let weaponsSecondary;
let tokenName = token.document.name;
let title;
let d;
const mainDialog = await new Promise((resolve, reject) => {
    d = new Dialog({
        title: `Weapon Loadout for ${tokenName}`,
        content,
        render: (html) => {
            const containerMain = document.querySelector('.mainWeaponImg');
            const clickMain =
                containerMain &&
                containerMain.addEventListener(
                    'click',
                    async function getMain(event) {
                        target = event.target;
                        if (target.nodeName != 'IMG') d.render(true);
                        if (
                            target.nodeName == 'IMG' &&
                            (mainWeaponID = target.getAttribute('id'))
                        ) {
                            mainChosenWeapon = actor.items.get(mainWeaponID);
                            chosenMainContent =
                                await mainWeaponChosenDialogContent(
                                    mainChosenWeapon
                                );
                            if (
                                mainChosenWeapon.system.properties.ver &&
                                !!mainChosenWeapon.system.damage.versatile
                            ) {
                                chosenMainContent = chosenMainContent.replace(
                                    `</form>`,
                                    `
                        <label for="attackMod">Extra Damage mods:</label>
                        <input id="versatile" type="checkbox"></input>
                        <label for="versatile">Use as Versatile?</label>
                        </form>`
                                );
                            }
                            if (
                                dueler &&
                                !mainChosenWeapon.system.properties.two
                            ) {
                                if (!mainChosenWeapon.system.properties.ver) {
                                    chosenMainContent =
                                        chosenMainContent.replace(
                                            `</form>`,
                                            `
                        <label for="attackMod">Extra Damage mods:</label>
                        <input id="dueling" type="checkbox"></input>
                        <label for="dueling">Dueling?</label>
                        </form>`
                                        );
                                } else
                                    chosenMainContent =
                                        chosenMainContent.replace(
                                            `</form>`,
                                            `
                        <input id="dueling" type="checkbox"></input>
                        <label for="dueling">Dueling?</label>
                        </form>`
                                        );
                            }
                            if (mainChosenWeapon.system.properties.two) {
                                d.data.content = chosenMainContent;
                                d.render(true);
                            } else {
                                let secondaryDialogContent =
                                    await getSecondaryDialogContent(
                                        mainChosenWeapon,
                                        chosenMainContent,
                                        false
                                    );
                                d.data.content = secondaryDialogContent[0];
                                d.render(true);
                            }
                        }
                        return mainChosenWeapon;
                    }
                );
            containerSecondary = document.querySelector('.secondaryWeaponImg');
            clickSecondary =
                containerSecondary &&
                containerSecondary.addEventListener(
                    'click',
                    async function getSecondary(event) {
                        target = event.target;
                        if (target.nodeName != 'IMG') d.render(true);
                        if (
                            target.nodeName == 'IMG' &&
                            (secondaryWeaponID = target.getAttribute('id'))
                        ) {
                            secondaryChosenWeapon =
                                actor.items.get(secondaryWeaponID);
                            chosenSecondaryContent = d.data.content;
                            getMainWeaponId = $(chosenSecondaryContent)
                                .find('.mainWeaponImg')
                                .attr('id');
                            dueling = chosenSecondaryContent.search('checked');
                            if (dueling === -1) dueling = false;
                            else dueling = true;
                            mainChosenWeapon = actor.items.get(getMainWeaponId);
                            ccc = await mainWeaponChosenDialogContent(
                                mainChosenWeapon
                            );
                            ccc = ccc.replace(
                                'Weapons available:',
                                'Main Hand item:'
                            );
                            if (dueling) {
                                ccc = ccc.replace(
                                    `</form>`,
                                    `<input id="dueling" type="checkbox" checked></input>
                            <label for="dueling">Let's Duel!</label></div>
                            </form>`
                                );
                                chosenInitialSecondaryContent =
                                    chosenSecondaryContent.split('</form>')[1];
                                chosenInitialSecondaryContent =
                                    chosenInitialSecondaryContent.replace(
                                        'Items available',
                                        'Secondary item chosen'
                                    );
                                chosenSecondaryContent =
                                    chosenSecondaryContent.split(
                                        '<p>Choose your off hand item.</p>'
                                    )[0];
                                chosenSecondaryContent =
                                    chosenSecondaryContent.replace(
                                        chosenSecondaryContent,
                                        ccc
                                    );
                                chosenSecondaryContent +=
                                    chosenInitialSecondaryContent;
                                d.data.content = chosenSecondaryContent;
                                d.render(true);
                            } else {
                                chosenInitialSecondaryContent =
                                    await getSecondaryDialogContent(
                                        mainChosenWeapon,
                                        ccc,
                                        null,
                                        secondaryChosenWeapon
                                    );
                                d.data.content =
                                    chosenInitialSecondaryContent[0];
                                d.render(true);
                            }
                        }
                    }
                );
            $('input#versatile').click(async function (html) {
                versatile = html.originalEvent.target.checked;
                versatileContent = d.data.content;
                getMainWeaponId = document.querySelector('.mainWeaponImg').id;
                getMainWeapon = actor.items.get(getMainWeaponId);

                if (versatile) {
                    let versatileDialogContent =
                        await mainWeaponChosenDialogContent(getMainWeapon);
                    versatileDialogContent = await getSecondaryDialogContent(
                        getMainWeapon,
                        versatileContent,
                        'versatile'
                    );
                    originalDialog = versatileDialogContent[1];
                    d.data.content = versatileDialogContent[0];
                    d.render(true);
                    setProperty(
                        d.options,
                        'originalVersatileDialog',
                        originalDialog
                    );
                } else {
                    //reset versatile checkbox
                    let versatileDialogContent = getProperty(
                        d.options,
                        'originalVersatileDialog'
                    );
                    d.data.content = versatileDialogContent;
                    d.render(true);
                }
                //return secondaryChosenWeapon
            });
            $('input#dueling').click(async function (html) {
                dueling = html.originalEvent.target.checked;
                duelingContent = d.data.content;
                getMainWeaponId = document.querySelector('.mainWeaponImg').id;
                getMainWeapon = actor.items.get(getMainWeaponId);
                if (dueling) {
                    let duelingDialogContent =
                        await mainWeaponChosenDialogContent(getMainWeapon);
                    duelingDialogContent = await getSecondaryDialogContent(
                        getMainWeapon,
                        duelingContent,
                        'dueling'
                    );
                    originalDialog = duelingDialogContent[1];
                    d.data.content = duelingDialogContent[0];
                    d.render(true);
                    setProperty(
                        d.options,
                        'originalDuelingDialog',
                        originalDialog
                    );
                } else {
                    let duelingDialogContent = foundry.utils.getProperty(
                        d.options,
                        'originalDuelingDialog'
                    );
                    d.data.content = duelingDialogContent;
                    d.render(true);
                }
            });
        },
        buttons: {
            yes: {
                icon: "<i class='fas fa-check'></i>",
                label: 'Accept Loadout!',
                callback: async (html) => {
                    let weaponMain;
                    let weaponSecondary;
                    const weaponMainId =
                        html[0].querySelector('.mainWeaponImg').id;
                    weaponMain = actor.items.get(weaponMainId);
                    const weaponSecondaryId = html[0].querySelector(
                        '.secondaryWeaponImg'
                    )?.id;
                    if (weaponSecondaryId)
                        weaponSecondary = actor.items.get(weaponSecondaryId);
                    const isVersatile =
                        html[0].querySelector('#versatile')?.checked;
                    const isDueling =
                        html[0].querySelector('#dueling')?.checked;
                    const results = {
                        weaponMain,
                        weaponSecondary,
                        isVersatile,
                        isDueling,
                    };
                    resolve(results);
                },
            },
            no: {
                icon: "<i class='fas fa-times'></i>",
                label: 'Reset selection',
                callback: () => {
                    let contentReset = initialDialogContent(weaponsInitial);
                    d.data.content = contentReset;
                    d.render(true);
                },
            },
        },
        default: 'yes',
    }).render(true, {
        width: '400',
        height: 'auto',
        resizable: true,
        id: 'Loadout',
    });
});

const { weaponMain, weaponSecondary, isVersatile, isDueling } =
    (await mainDialog) ?? {};
if (!weaponMain) {
    return ui.notifications.warn(
        `${game.user.name} you didn't choose any weapon for you main hand (loadout aborted)!`
    );
}

let updates = await changeWeapons(weaponMain, weaponSecondary);

updates = updates.concat(
    actor.items
        .filter(
            (i) =>
                //i.name !== weaponMain.name && i.name !== weaponSecondary?.name
                !updates.some((u) => u._id == i._id)
        )
        .filter((i) => i.type === 'weapon' || i.system.armor?.type === 'shield')
        .map((i) => {
            return { _id: i.id, 'system.equipped': false };
        })
);
await actor.updateEmbeddedDocuments('Item', updates);

if (weaponSecondary?.type === 'weapon' && !!dualWielderFeat) {
    await applyDualWieldingACbonus(actor);
}

if (!weaponsSecondary?.type === 'weapon') {
    await removeDualWieldingACbonus(actor);
}

//FUNCTIONS
async function applyDualWieldingACbonus(actor) {
    const effectData = {
        changes: [
            {
                key: 'system.attributes.ac.bonus',
                mode: CONST.ACTIVE_EFFECT_MODES.ADD,
                value: '+1',
            },
        ],
        duration: {
            startTime: game.time.worldTime,
        },
        icon: 'icons/skills/melee/weapons-crossed-swords-yellow-teal.webp',
        name: 'Dual Wielder AC boost',
        tint: '',
        flags: {
            world: { dualWielderFeat: true },
        },
        origin: dualWielderItem.uuid,
    };
    await actor.createEmbeddedDocuments('ActiveEffect', [effectData]);
}

async function removeDualWieldingACbonus(actor) {
    await actor.effects.getName('Dual Wielder AC boost')?.delete();
}

async function changeWeapons(weaponM, weaponS) {
    //@to-do: thrown weapons. If weaponM = weaponS check quantity?
    let updateM;
    let updateS;
    const quantityM = weaponM.system.quantity;
    let quantityS = weaponS?.system.quantity;
    let changes = [];
    if (quantityM > 1 && quantityS > 1)
        changes = await splitWeapon(weaponM, weaponS);
    else if (quantityM > 1 && quantityS < 2)
        changes = await splitWeapon(weaponM, null);
    else if (quantityM < 2 && quantityS > 1)
        changes = await splitWeapon(null, weaponS);

    let updateFinal = undefined;
    if (!!changes.length) {
        weaponM = !!changes[0] ? actor.items.get(changes[0]) : weaponM; //split weapon created for weaponM
        weaponS = !!changes[1] ? actor.items.get(changes[1]) : weaponS; //split weapon created for weaponS
        updateFinal = changes.slice(2); //{originalWeaponId1,equipped:false,quantity:-1 or -2} and a second if needed
    }

    const {
        properties: propertiesM,
        range: rangeM,
        actionType: actionTypeM,
        damage: damageM,
    } = weaponM?.system || '';
    //Secondary weapon
    const {
        range: rangeS,
        damage: damageS,
        activation: activationS,
    } = weaponS?.system || '';

    const mainFlag = {
        originalWeaponLoadout: {
            updateWeapon: {
                _id: weaponM.flags.world?.originalWeaponLoadout?.splitWeapon
                    ? weaponM.flags.world?.originalWeaponLoadout?.splitWeapon
                    : weaponM.id,
                name: weaponM.name,
                'system.damage': damageM,
                'system.range': rangeM,
                'system.actionType': actionTypeM,
                'system.quantity': quantityM,
            },
        },
    };
    const secondaryFlag = {};
    if (!!weaponS)
        secondaryFlag['originalWeaponLoadout'] = {
            updateWeapon: {
                _id: weaponS.flags.world?.originalWeaponLoadout?.splitWeapon
                    ? weaponS.flags.world?.originalWeaponLoadout?.splitWeapon
                    : weaponS.id,
                name: weaponS.name,
                'system.damage': damageS,
                'system.range': rangeS,
                'system.activation': activationS,
                'system.quantity': quantityS,
            },
        };
    if (weaponM) {
        //mwak - 2-Handed weapons or Main weapon that is not to be used as versatile or under dueling feature.
        if (
            (propertiesM.two && !isVersatile && actionTypeM !== 'rwak') ||
            (actionTypeM !== 'rwak' && !isDueling && !isVersatile) ||
            (actionTypeM === 'rwak' && !sharpShooter)
        ) {
            updateM = {
                _id: weaponM.id,
                name: `(main) ${weaponM.name}`,
                'flags.world': mainFlag,
                'system.equipped': true,
            };
        }
        //rwak - 2-handed weapons like bows, (with and without sharpshooter feat)
        else if (actionTypeM === 'rwak' && sharpShooter) {
            const newRangeM = deepClone(rangeM);
            newRangeM.value = newRangeM.long;
            newRangeM.long = '';
            updateM = {
                _id: weaponM.id,
                name: `(main) ${weaponM.name}`,
                'flags.world': mainFlag,
                'system.range': newRangeM,
                'system.equipped': true,
            };
        }
        //Versatile weapons
        else if (isVersatile) {
            const newDamageM = deepClone(damageM);
            newDamageM.parts[0][0] = newDamageM.versatile;
            newDamageM.versatile = '';
            // if (!!damageM.versatile) {
            updateM = {
                _id: weaponM.id,
                name: `(vers) ${weaponM.name}`,
                'flags.world': mainFlag,
                'system.damage': newDamageM,
                'system.equipped': true,
            };
        }
        //Dueling
        else if (isDueling) {
            const newDamageM = deepClone(damageM);
            newDamageM.parts[0][0] = newDamageM.parts[0][0].replace(
                '@mod',
                '2 + @mod'
            );
            updateM = {
                _id: weaponM.id,
                name: `(main) ${weaponM.name}`,
                'flags.world': mainFlag,
                'system.damage': newDamageM,
                'system.equipped': true,
            };
        }
    }
    if (weaponS) {
        //Take care of shields first
        if (weaponS.type === 'equipment') {
            updateS = { _id: weaponS.id, 'system.equipped': true };
        } else {
            const newActivastionS = deepClone(activationS);
            newActivastionS.type = 'bonus';
            if (!twoWeaponFighter) {
                const newDamageS = deepClone(damageS);
                const mod =
                    actor.system.abilities[weaponS.system.abilityMod]?.mod;
                if (!!mod && mod > 0) {
                    newDamageS.parts[0][0] = newDamageS.parts[0][0].replace(
                        '@mod',
                        ''
                    );
                }
                updateS = {
                    _id: weaponS.id,
                    name: `(off-hand) ${weaponS.name}`,
                    'flags.world': secondaryFlag,
                    'system.damage': newDamageS,
                    'system.activation': newActivastionS,
                    'system.equipped': true,
                };
            } else {
                updateS = {
                    _id: weaponS.id,
                    name: `(off-hand) ${weaponS.name}`,
                    'flags.world': secondaryFlag,
                    'system.activation': newActivastionS,
                    'system.equipped': true,
                };
            }
        }
    }
    let returns;
    if (weaponS) returns = [updateM, updateS];
    else returns = [updateM];
    if (!!updateFinal) returns = returns.concat(updateFinal);
    return returns;
}

async function revertWeapons(weapons) {
    const updateparts = [];

    const toDeletelWeapons = weapons //do we need weapon1 and weapon2? dont think so
        .filter((i) => i.flags.world?.originalWeaponLoadout?.splitWeapon);
    const toDeletelWeaponIds = toDeletelWeapons.map((i) => i.id);

    if (!!toDeletelWeapons.length) {
        const splitWeaponIds = toDeletelWeapons.map(
            (i) => i.flags.world?.originalWeaponLoadout?.splitWeapon
        );
        if (
            splitWeaponIds.length > 1 &&
            splitWeaponIds[1] === splitWeaponIds[0]
        )
            updateparts;
        for (const w of toDeletelWeapons)
            updateparts.push({
                _id: w.flags.world?.originalWeaponLoadout?.splitWeapon,
            });
    }

    const updateOriginalWeapons = weapons
        .map((i) => i.flags.world?.originalWeaponLoadout?.updateWeapon)
        .filter((i) => !!i);
    for (const OGweapon of updateOriginalWeapons)
        if (!isEmpty(OGweapon)) {
            OGweapon['flags.world.-=originalWeaponLoadout'] = null;
            OGweapon.system.equipped = false;
        }

    await actor.updateEmbeddedDocuments('Item', updateOriginalWeapons);
    await actor.deleteEmbeddedDocuments('Item', toDeletelWeaponIds);
}

async function splitWeapon(weaponM, weaponS) {
    const newWeaponsData = [false, false];
    const newWeaponM = weaponM?.toObject();
    const newWeaponS = weaponS?.toObject();
    if (!!newWeaponM) {
        newWeaponM.system.quantity = 1;
        setProperty(
            newWeaponM.flags,
            'world.originalWeaponLoadout.splitWeapon',
            weaponM.id
        );
        if (weaponM.system.actionType === 'rwak') {
            newWeaponM.system.consume = {
                type: 'ammo',
                target: weaponM.id,
                amount: 1,
            };
        }
        newWeaponsData[0] = newWeaponM;
    }
    if (!!newWeaponS) {
        newWeaponS.system.quantity = 1;
        setProperty(
            newWeaponS.flags,
            'world.originalWeaponLoadout.splitWeapon',
            weaponS.id
        );
        if (weaponS.system.actionType === 'rwak') {
            newWeaponS.system.consume = {
                type: 'ammo',
                target: weaponM.id,
                amount: 1,
            };
        }
        newWeaponsData[1] = newWeaponS;
    }
    if (!newWeaponsData.length) return newWeaponsData;
    let returns;
    if (!!newWeaponsData[0] && !!newWeaponsData[1])
        returns = (
            await actor.createEmbeddedDocuments('Item', newWeaponsData)
        ).map((i) => i.id);
    else if (!!newWeaponsData[0] && !newWeaponsData[1])
        returns = [
            (
                await actor.createEmbeddedDocuments('Item', [newWeaponsData[0]])
            )[0].id,
            false,
        ];
    else
        returns = [
            false,
            (
                await actor.createEmbeddedDocuments('Item', [newWeaponsData[1]])
            )[0].id,
        ];
    if (!!weaponM) {
        const quantityM =
            weaponM === weaponS
                ? weaponM.system.quantity - 2
                : weaponM.system.quantity - 1;
        returns.push({
            _id: weaponM.id,
            'system.equipped': false,
            'system.quantity': quantityM,
        });
    }
    if (!!weaponS && weaponS !== weaponM) {
        returns.push({
            _id: weaponS.id,
            'system.equipped': false,
            'system.quantity': weaponS.system.quantity - 1,
        });
    }
    return returns;
}

function initialDialogContent(weapons) {
    let initialWeaponsContent = weapons.reduce(
        (acc, weapon) =>
            (acc += `<img width="36" height="36" src="${weapon?.img}" title="${weapon.name}" id="${weapon.id}"/>`),
        ``
    );
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
    `;
    return content;
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
    `;
    return content;
}

async function getSecondaryDialogContent(
    mainWeapon,
    content,
    damageOptions,
    secondaryWeapon
) {
    if (secondaryWeapon) {
        //if a secondary is already provided do the dialog rerendering
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
        `;
        let secondaryDialogInitialContent = content;
        content += secondaryDialogContent;
        let returns = [content, secondaryDialogInitialContent];
        return returns;
    }
    if (!damageOptions) {
        //if no damageOptions (versatile or dueling selected)
        if (mainWeapon.system.properties.two) return content;
        else if (!mainWeapon.system.properties.two && !dualWielderFeat) {
            weaponsSecondary = actor.itemTypes.weapon
                .filter((i) => i.system.properties.lgt)
                .filter((i) => !i.system.properties.two); //if not Dual Wielder only Light Weapons
        } else {
            weaponsSecondary = actor.itemTypes.weapon.filter(
                (i) => !i.system.properties.two
            ); //check to ensure no two handed weapon is in secondaries
        }
        // if (mainWeapon.system.quantity <=1) weaponsSecondary=weaponsSecondary.filter(i=>i.name !== mainWeapon.name)
        if (mainWeapon.system.quantity <= 1)
            weaponsSecondary = weaponsSecondary.filter(
                (i) => i.id !== mainWeapon.id
            );
        if (!!shieldItems.length) {
            //if there are shields on the inventory, put them in the secondary available
            for (let shieldItem of shieldItems) {
                weaponsSecondary = weaponsSecondary.concat(shieldItem);
            }
        }
    } else if (damageOptions) {
        //if versatile or dueling is selected.
        if (damageOptions === 'versatile') {
            let versatileContent = await mainWeaponChosenDialogContent(
                mainChosenWeapon
            );
            versatileContent = versatileContent.replace(
                `</form>`,
                `<div class="versatile">
                <input id="versatile" type="checkbox" checked></input>
                <label for="dueling">Versatile!</label></div>
                </form>`
            );
            let returns = [versatileContent, content];
            return returns;
        } else if (damageOptions === 'dueling') {
            let duelingContent = await mainWeaponChosenDialogContent(
                mainChosenWeapon
            );
            duelingContent = duelingContent.replace(
                `</form>`,
                `
                <div class="dueling">
                <input id="dueling" type="checkbox" checked></input>
                <label for="dueling">Dueling?!</label></div>
                </form>`
            );
            if (!!shieldItems.length) {
                weaponsSecondary = [];
                for (let shieldItem of shieldItems) {
                    weaponsSecondary = weaponsSecondary.concat(shieldItem);
                }
                weaponsSecondary = weaponsSecondary.reduce(
                    (acc, weapon) =>
                        (acc += `<img class="secondaryWeaponImg" height="36" src="${weapon?.img}" title="${weapon.name}" id="${weapon.id}"/>`),
                    ``
                );
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
                    `;
                duelingContent += secondaryDialogContent;
                let returns = [duelingContent, content];
                return returns;
            } else {
                let returns = [duelingContent, content];
                return returns;
            }
        }
    }
    weaponsSecondary = weaponsSecondary.reduce(
        (acc, weapon) =>
            (acc += `<img height="36" src="${weapon?.img}" title="${weapon.name}" id="${weapon.id}"/>`),
        ``
    );
    let secondaryDialogContent = `
      <p>Choose your off hand item.</p>
      <hr>
      <form>
      <div class="form-group"><label for="type">Items available:</label><div class="form-fields"><center><a class="secondaryWeaponImg">${weaponsSecondary}</a></center></div></div>
      </form>
    `;
    let secondaryDialogInitialContent = content;
    content += secondaryDialogContent;
    let returns = [content, secondaryDialogInitialContent];
    return returns;
}
