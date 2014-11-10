if (Meteor.isClient) {
  Meteor.startup(function () {
    if (typeof console !== 'undefined')
    {
      $.getJSON("https://na.api.pvp.net/api/lol/static-data/na/v1.2/champion?champData=spells&api_key=c8a49068-20bf-40d1-8834-891b15913db3", function (data) { 
        window.champData = data;
        console.log(data)
      })
      $.getJSON("https://na.api.pvp.net/api/lol/static-data/na/v1.2/champion?champData=image&api_key=c8a49068-20bf-40d1-8834-891b15913db3", function (data) { 
        window.imageData = data;
        console.log(data)
      })
    }
  });

  Template.calculate.greeting = function () {
    return "Welcome to the League of Efficiency.";
  };

  Template.calculate.events({
    'click input': function () {
      console.log(window.imageData[1]);
      console.log(window.champData);
    }
  });
}
