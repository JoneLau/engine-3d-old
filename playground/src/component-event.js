(() => {
  const { cc, app } = window;
  const { color4 } = cc.math;

  class ManagerComponent extends cc.ScriptComponent {

    constructor() {
      super();
    }

    onClk(a, b) {
      console.log('on clk ' + a + '  ' + b);
    }
  }

  app.registerClass('Manager', ManagerComponent);

  let screen = app.createEntity('screen');
  screen.addComp('Screen');

  let ent = app.createEntity('button');
  ent.setParent(screen);
  let image = ent.addComp('Image');
  image.setOffset(0, 50);
  image.setSize(160, 30);
  let button = ent.addComp('Button');
  button.background = ent;
  button.transition = 'color';
  button.transitionColors.normal = color4.new(0.8, 0.8, 0.8, 1);
  button.transitionColors.highlight = color4.new(1, 1, 0, 1);
  button.transitionColors.pressed = color4.new(0.5, 0.5, 0.5, 1);
  button.transitionColors.disabled = color4.new(0.2, 0.2, 0.2, 1);
  button._updateState();
  ent.addComp('Manager');

  let label = app.createEntity('label');
  label.setParent(ent);
  let text = label.addComp('Text');
  text.color = color4.new(0, 0, 0, 1);
  text.align = 'middle-center';
  text.text = 'clcik me!';
  text.setSize(0, 0);
  text.setAnchors(0, 0, 1, 1);

  let manager = app.createEntity('manager');
  manager.setParent(screen);
  let managerImage=manager.addComp('Image');
  managerImage.color = color4.create();
  managerImage.setOffset(0, -50);
  managerImage.setSize(160, 30);
  let managerComp = manager.addComp('Manager');

  let receiveLabel = app.createEntity('label');
  receiveLabel.setParent(manager);
  let receiveText = receiveLabel.addComp('Text');
  receiveText.color = color4.new(0, 0, 0, 1);
  receiveText.align = 'middle-center';
  receiveText.text = 'receiver';
  receiveText.setSize(0, 0);
  receiveText.setAnchors(0, 0, 1, 1);

  let cLabel = app.createEntity('label');
  cLabel.setParent(screen);
  let cText = cLabel.addComp('Text');
  cText.color = color4.create();
  cText.align = 'middle-center';
  cText.text = 'View the results in the console';
  cText.setSize(500, 30);
  cText.setOffset(0, -150);

  let evt1 = new cc.ComponentEvent();
  evt1.target = ent;
  evt1.component = 'Manager';
  evt1.handler = 'onClk';
  evt1.customEventData = ent.name;

  let evt2 = new cc.ComponentEvent();
  evt2.target = manager;
  evt2.component = 'Manager';
  evt2.handler = 'onClk';
  evt2.customEventData = manager.name;

  let arry = [evt1, evt2];
  button.onClickListerner = arry;

})();