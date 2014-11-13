if (Meteor.isClient) {
  Meteor.startup(function () {
    if (typeof console !== 'undefined')
    {
      $.getJSON("https://na.api.pvp.net/api/lol/static-data/na/v1.2/champion?champData=all&api_key=c8a49068-20bf-40d1-8834-891b15913db3", function (data) { 
        window.championdescriptions = data;
      })
      window.goldvalue = new goldValue();
      window.spellarray = [];
      window.championstats = {};

      Meteor.call('getSpellData', function(err,response) {
        if(err) {
          Session.set('serverDataResponse', "Error:" + err.reason);
          return;
        }
        Session.set('serverDataResponse', response);
      });
    }
  });

  Template.calculate.greeting = function () {
    return "Welcome to the League of Efficiency.";
  };

  Template.calculate.events({
    'click input.btn': function () {
      $(".img").detach();
      $(".break").detach();
      var level = document.getElementById("champion-level").value;
      var abilitylevel = document.getElementById("ability-level").value;
      window.spellarray =  [];
      var championdata = Session.get('serverDataResponse');

      for (var champion in championdata.data) {
        var basestats = new getBaseStats(champion, level);
        window.championstats[champion] = basestats;
        for (var i = 0; i < championdata.data[champion].spells.length; i++) {
          var spell = new spellPower(abilitylevel, championdata.data[champion].spells[i]);
          if (spell.spell.classification != "untested")
            window.spellarray.push(spell);
        }
      }

      for (var spell in window.spellarray) {
        window.spellarray[spell].calculateValue();

      }
      normalizeRanks();
      displayTop();
          /*Things to consider: However 
            Damage - Normalize on a 0-10 scale - Can do
            Healing - Normalize on a 0-10 scale - I think I can do
            Damage prevented/Shield - Normalize on a 0-10 scale - 
            CC Prevented - yes/no - Give value based on how many it effects
            Duration - How long were they being effected (Fiddle ult)
            Hard CC - Normalize on a scale of 1 - 10
            Soft CC - Normalize on a scale of 1 - 5 
            Stat Steroids - Gold value - Normalize on a 0-8 scale
            Mobility - Normalize distance on a 0-10 scale

            DIVIDE THIS BY THE COST! --- umm normalized?
          */
    }
  });

  var goldValue = function () {
    //values borrowed from http://leagueoflegends.wikia.com/wiki/Gold_efficiency
    this.ad = 36;
    this.ap = 21.75;
    this.armor = 20;
    this.mr = 20;
    this.health = 2.66;
    this.mana = 2;
    this.hregen = 36;
    this.mregen = 60;
    this.critchance = 50;
    this.as = 30;
    this.ms = 13;
    this.cdr = 31.67;
    this.ls = 55;
    this.sv = 27.5;
  };

  var spellPower = function (_level, _spell) {
    this.spell = _spell;
    this.level = _level;
    this.damagerank = 0;//10
    this.healingrank = 0;//10
    this.shieldrank = 0;//10
    this.ccShieldrank = 0;//5
    this.ccHardrank = 0;//10
    this.ccSoftrank = 0;//5
    this.steroidrank = 0;//10
    this.mobilityrank = 0;//3
    this.rangerank = 0;//3
    this.totalrank = 0;
    this.cooldown = 0;
    this.manacost = 0;
    this.healthcost = 0;

    this.calculateValue = function () {
      /*Yes I took a lot of liberties calculating the efficiencies.
        -For starters- I assume user inputted values is the same for all enemies effected.
        -AOE range is not, so a 5 man Karthus Requiem will be compared with a 5 man Jax CounterStrike
        -Abilities that have a range of damages (Gragas Barrel Roll) are simply approximately average. 
        -Skillshots are all assumed to have equal chance of landing
        -I only distinguish between hard, soft, and irreducible cc (knock ups/suppresses)
        -Buffs are calculated as a gold value
        -Each category is normalized to a ratio of a max value, which is the highest value in that category, then summated
        -Spells are looked at individually, not in conjunction with passives
        -Abilities that can be changed (toggle, Mimic, etc) are looked at individually
        -Minions don't exist and wave clear isn't considered
        -Everything procs spell vamp...even though auto attack enhancers aren't supposed to
        -I probably cut a few more corners... #yolo
      */
      
      var enemieseffected = Math.min(document.getElementById("num-enemies-effected").value, this.spell.maxenemies);
      var allieseffected = Math.min(document.getElementById("num-allies-effected").value, this.spell.maxallies);
      var basestats = window.championstats[this.spell.key];
      var bonus = 0;
      var rank = Math.min(this.level,  this.spell.maxrank) - 1;
      for (var i = 1; i < this.spell.effect.length; i++)
      {
        switch(this.spell.effectType[i]) {
          case "baseheal": 
            this.healingrank += this.spell.effect[i][rank] + bonus;
            break;
          case "basedamage":
            this.damagerank += this.spell.effect[i][rank] + bonus;
            bonus = 0;
            break;
          case "shield":
            this.shieldrank += this.spell.effect[i][rank] + bonus;
            bonus = 0;
            break;
          // ratios
          case "abilitypower":
            bonus += this.spell.effect[i][rank]*document.getElementById("ability-power").value;
            break;
          case "attackdamage":
            bonus += this.spell.effect[i][rank]*(document.getElementById("attack-damage").value + basestats.attackdamage);
            break;
          case "bonusattackdamage":
            bonus += this.spell.effect[i][rank]*document.getElementById("attack-damage").value;
            break;
          case "manapercent":
            bonus += this.spell.effect[i][rank]*(document.getElementById("bonus-mana").value + basestats.mana);
            break;
          case "maxhealth":
            bonus += this.spell.effect[i][rank]*(document.getElementById("bonus-health").value + basestats.health);
            break;
          case "bonushealth":
            bonus += this.spell.effect[i][rank]*document.getElementById("bonus-health").value;
            break;
          case "bonusarmor":
            bonus += this.spell.effect[i][rank]*(document.getElementById("bonus-armor").value+basestats.armor);
            break;
          case "enemymaxhealth":
            bonus += this.spell.effect[i][rank]*document.getElementById("enemy-max-health").value;
            break;
          case "enemycurrenthealth":
            bonus += this.spell.effect[i][rank]*document.getElementById("enemy-current-health").value;
            break;
          case "enemymissinghealth":
            bonus += this.spell.effect[i][rank]*(document.getElementById("enemy-max-health").value-document.getElementById("enemy-current-health").value);
            break;
          //costs
          case "cooldown":
            this.cooldown += this.spell.effect[i][rank]*(1-document.getElementById("cooldown-reduction").value/100);
            break;
          case "mana":
            this.manacost += this.spell.effect[i][rank];
            break;
          case "pofcurrenthealth":
            this.healthcost += this.spell.effect[i][rank]/100*document.getElementById("current-health").value;
            break;
          case "pofmaxhealth":
            this.healthcost += this.spell.effect[i][rank]*(document.getElementById("bonus-health").value + basestats.health);
            break;
          case "flathealthcost":
            this.healthcost += this.spell.effect[i][rank];
            break;
          //utility
          case "irreducible":
            this.ccHardrank += this.spell.effect[i][rank];
            break;
          case "hard":
            this.ccHardrank += this.spell.effect[i][rank]*(1-(document.getElementById("tenacity").value/100));
            break;
          case "soft":
            this.ccSoftrank += this.spell.effect[i][rank]*(1-(document.getElementById("tenacity").value/100));
            break;    
          case "slowstrength":
            this.ccSoftrank *= this.spell.effect[i][rank];
            break;     
          case "range":
            if (this.spell.classification == "dash")
              this.mobilityrank = 3;
            else
              this.rangerank += this.spell.effect[i][rank];
            break;
          //steroids
          case "percentdamagereduction":
            this.shieldrank += this.spell.effect[i][rank]*document.getElementById("enemy-dps").value;
            break;  
          case "statattackdamageflat":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.ad + bonus;
            bonus = 0;
            break;
          case "statattackdamagepercent":
            this.steroidrank += this.spell.effect[i][rank]*(window.goldvalue.ad *(document.getElementById("attack-damage").value + basestats.attackdamage));
            break;
          case "statabilitypower":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.ap;
            break;
          case "statattackspeed":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.as;
            break;
          case "statarmor":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.armor;//armor given or armor taken away
            break;
          case "statarmorpercent":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.armor*(basestats.armor+document.getElementById("bonus-armor").value);//armor given or armor taken away
            break;
          case "statmagicresist":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.mr;
            break;
          case "stathealth":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.health;
            break;       
          case "statmana":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.mana;
            break;
          case "stathealthregen":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.hregen;
            break;
          case "statmanaregen":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.mregen;
            break;
          case "statcritchance":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.critchance;
            break;
          case "statmovespeedflat":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.ms + bonus;
            break;
          case "statmovespeedpercent":
            this.steroidrank += ((this.spell.effect[i][rank] + bonus)*window.goldvalue.ms*basestats.ms);
            break;
          case "statcooldownreduction":
            this.steroidrank += this.spell.effect[i][rank]*window.goldvalue.cdr;
            break;  
          case "buffduration":
            this.steroidrank *(1-(1/this.spell.effect[i][rank]));
            break;
          default:
        }
      } 
      switch (this.spell.effectType[0]) {
        case "p":
          var armor = document.getElementById("enemy-armor").value*(1-(document.getElementById("percent-armor-pen").value/100));
          armor -= document.getElementById("flat-armor-pen").value;
          if (armor >= 0)
            this.damagerank *= 100/(100+armor);
          else 
            this.damagerank *= (2- 100/(100-armor));
          break;
        case "m":
          var mr = document.getElementById("enemy-magic-resist").value*(1-(document.getElementById("percent-magic-pen").value/100));
          mr -= document.getElementById("flat-magic-pen").value;
          if (mr >= 0)
            this.damagerank *= 100/(100+mr);
          else 
            this.damagerank *= (2- 100/(100-mr));
          break;
      }
      if (allieseffected) { 
        this.shieldrank *= allieseffected;
        this.steroidrank *= allieseffected;
        // this.ccShieldrank *= allieseffected;
      }
      var sum = this.healingrank;
      for (var i = 1; i < allieseffected; i++)
      {
        if ((i*this.spell.damagereduction) < 1)
          sum += this.healingrank * (1 - i*this.spell.damagereduction);
      }

      this.healingrank = sum;
      if (enemieseffected) {
        this.ccHardrank *= enemieseffected;
        this.ccSoftrank *= enemieseffected;
      }

      sum = this.damagerank;
      for (var i = 1; i < enemieseffected; i++)
      {
        if ((i*this.spell.damagereduction) < 1)
          sum += this.damagerank * (1 - i*this.spell.damagereduction);
      }
      this.damagerank = sum;

      if (this.spell.classification  == "skillshot") {
        this.damagerank *= (document.getElementById("percent-hit").value/100);       
        this.ccHardrank *= (document.getElementById("percent-hit").value/100);
        this.ccSoftrank *= (document.getElementById("percent-hit").value/100);
      }
      if (this.spell.maxenemies > 1)
        this.healingrank += this.damagerank*document.getElementById("spell-vamp").value/300;
      else if (this.spell.maxenemies == 1)
        this.healingrank += this.damagerank*document.getElementById("spell-vamp").value/100;
    };

    this.totalRank = function () {
      this.totalrank = this.damagerank + this.healingrank + this.shieldrank + this.ccShieldrank + this.ccSoftrank + this.ccHardrank + this.steroidrank + this.mobilityrank + this.rangerank;
      this.totalrank /= (this.cooldown + this.manacost + this.healthcost);
    }
            /*Things to consider:
              Damage - Normalize on a 0-10 scale
              Healing - Normalize on a 0-10 scale
              Damage prevented/Shield - Normalize on a 0-10 scale
              CC Prevented - yes/no - Give value based on how many it effects
              Hard CC - Normalize on a scale of 1 - 10
              Soft CC - Normalize on a scale of 1 - 5 
              Stat Steroids - Gold value - Normalize on a 0-10 scale
              Mobility - Normalize distance on a 0-10 scale
            */
  };

  var getBaseStats = function (_champ, _level)
  {
    this.key = _champ;
    this.level = _level;
    this.stats = window.championdescriptions.data[_champ].stats;
    this.ms = this.stats.movespeed;
    this.armor = this.stats.armor + (_level*this.stats.armorperlevel);
    this.attackdamage = this.stats.attackdamage + (_level*this.stats.attackdamageperlevel);
    this.health = this.stats.hp + (_level*this.stats.hpperlevel);
    this.mana = this.stats.mp + (_level*this.stats.mpperlevel);
    this.magicresist = this.stats.spellblock + (_level*this.stats.spellblockperlevel);
  }

  var normalizeRanks = function ()
  {
    var maxdamage = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.damagerank;})))
    var maxhealing = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.healingrank;})))
    var maxshield = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.shieldrank;})))
    // var maxccShield = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.ccShieldrank;})))
    var maxccHard = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.ccHardrank;})))
    var maxccSoft = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.ccSoftrank;})))
    var maxsteroid = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.steroidrank;})))
    var maxrange = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.rangerank;})))
    var maxmana = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.manacost;})))
    var maxhealth = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.healthcost;})))
    var maxcooldown = Math.sqrt(Math.max.apply(Math,window.spellarray.map(function(o){return o.cooldown;})))

//     console.log(maxdamage);
//     console.log(maxhealing);
//     console.log(maxshield);
//     console.log(maxccHard);
//     console.log(maxccSoft);
//     console.log(maxsteroid);
//     console.log(maxrange);
//     console.log(maxmana);
//     console.log(maxhealth);
//     console.log(maxcooldown);

    for (var spell in window.spellarray) {
        window.spellarray[spell].damagerank = Math.sqrt(window.spellarray[spell].damagerank)*10/maxdamage;
        window.spellarray[spell].healingrank = Math.sqrt(window.spellarray[spell].healingrank)*8/maxhealing;
        window.spellarray[spell].shieldrank = Math.sqrt(window.spellarray[spell].shieldrank)*8/maxshield;
        window.spellarray[spell].ccHardrank = Math.sqrt(window.spellarray[spell].ccHardrank)*8/maxccHard;
        window.spellarray[spell].ccSoftrank = Math.sqrt(window.spellarray[spell].ccSoftrank)*4/maxccSoft;
        window.spellarray[spell].steroidrank = Math.sqrt(window.spellarray[spell].steroidrank)*10/maxsteroid;
        window.spellarray[spell].rangerank = Math.sqrt(window.spellarray[spell].rangerank)*4/maxrange;
        window.spellarray[spell].manacost = Math.sqrt(window.spellarray[spell].manacost)*8/maxmana;
        window.spellarray[spell].healthcost = Math.sqrt(window.spellarray[spell].healthcost)*8/maxhealth;
        window.spellarray[spell].cooldown = Math.sqrt(window.spellarray[spell].cooldown)*10/maxcooldown;
        window.spellarray[spell].totalRank();
    }
    window.spellarray.sort(compareSpells);
  }

  function compareSpells(a,b) {
    if (a.totalrank > b.totalrank)
       return -1;
    if (a.totalrank < b.totalrank)
      return 1;
    return 0;
  }

  var displayTop = function () {
    for (var spell in window.spellarray) {
      var spell = window.spellarray[spell];
      var index = spell.spell.index;
      var champ = window.championdescriptions.data[spell.spell.key];
      $("#most-eff-header").append($('<div class="img" style="height:48px; width:48px; background: url(\'//ddragon.leagueoflegends.com/cdn/4.19.2/img/sprite/' + champ.image.sprite +'\') -'+ champ.image.x +'px -'+ champ.image.y + 'px no-repeat;" data-rg-name="champion" data-rg-id="'+spell.spell.key+'"><span class="spell-name">'+ spell.spell.name+'</span></div><br class="break"><br class="break">'));
    }
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    Meteor.methods({
      getSpellData: function () {
        return JSON.parse(Assets.getText("spell-data.json"));
      }
    });
  });
}