class cfg
{
    postDBLoad(container) 
    {        
        const items = container.resolve("DatabaseServer").getTables().templates.items
        const locales = container.resolve("DatabaseServer").getTables().locales

        //roubles
        items["5449016a4bdc2d6f028b456f"]._props.StackMaxSize = 2147483647;
        items["5449016a4bdc2d6f028b456f"]._props.Prefab.path = "roubles/roubles.bundle";
        items["5449016a4bdc2d6f028b456f"]._props.BackgroundColor = "violet";

        for (const localeID in locales.global)
        {
            locales.global[localeID][`${"5449016a4bdc2d6f028b456f"} Name`] = "Rouble debit card.";
            locales.global[localeID][`${"5449016a4bdc2d6f028b456f"} ShortName`] = "<color=#32CD32>RUB</color>";
            locales.global[localeID][`${"5449016a4bdc2d6f028b456f"} Description`] = "Convenient means of storing currency.";
        }

        //dollars
        items["5696686a4bdc2da3298b456a"]._props.StackMaxSize = 2147483647;
        items["5696686a4bdc2da3298b456a"]._props.Prefab.path = "dollars/dollars.bundle";
        items["5696686a4bdc2da3298b456a"]._props.BackgroundColor = "violet";

        for (const localeID in locales.global)
        {
            locales.global[localeID][`${"5696686a4bdc2da3298b456a"} Name`] = "Dollars debit card.";
            locales.global[localeID][`${"5696686a4bdc2da3298b456a"} ShortName`] = "<color=#32CD32>USD</color>";
            locales.global[localeID][`${"5696686a4bdc2da3298b456a"} Description`] = "Convenient means of storing currency.";
        }

        //euro
        items["569668774bdc2da2298b4568"]._props.StackMaxSize = 2147483647;
        items["569668774bdc2da2298b4568"]._props.Prefab.path = "euros/euros.bundle";
        items["569668774bdc2da2298b4568"]._props.BackgroundColor = "violet";

        for (const localeID in locales.global)
        {
            locales.global[localeID][`${"569668774bdc2da2298b4568"} Name`] = "Euros debit card.";
            locales.global[localeID][`${"569668774bdc2da2298b4568"} ShortName`] = "<color=#32CD32>EUR</color>";
            locales.global[localeID][`${"569668774bdc2da2298b4568"} Description`] = "Convenient means of storing currency.";
        }

    }
}

module.exports = {mod: new cfg};