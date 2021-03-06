import {use, inject} from 'di/testing';
import {Compiler} from '../src/compiler';
import {Selector} from '../src/selector/selector';
import {DirectiveClass} from '../src/directive_class';
import {TemplateDirective, DecoratorDirective, ComponentDirective} from '../src/annotations';
import {ViewFactory, ElementBinder} from '../src/view_factory';
import {CompilerConfig} from '../src/compiler_config';
import {$, $0, $html} form './dom_mocks';

describe('Compiler', ()=>{
  var selector:Selector,
      binders,
      nodes,
      attrDirectiveAnnotations;

  it('should not reparent nodes', inject(Compiler, (compiler)=>{
    createSelector();
    nodes = $('a');
    var node = nodes[0];
    var oldParent = node.parentNode;
    compiler._compile(nodes, selector);
    expect(node.parentNode).toBe(oldParent);
  }));

  describe('mark nodes with directives and collect binders', ()=> {
    it('should work for one element', function() {
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);

      // all possible combinations of elements with decorators and elements
      // without decorators
      compileAndVerifyBinders('<div></div>', '()');
      compileAndVerifyBinders('<div name="1"></div>', '(),1()');
    });

    it('should work for two sibling elements', function() {
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);

      // all possible combinations of elements with decorators and elements
      // without decorators
      compileAndVerifyBinders('<div></div><div></div>', '()');
      compileAndVerifyBinders('<div name="1"></div><div></div>', '(),1()');
      compileAndVerifyBinders('<div></div><div name="1"></div>', '(),1()');
      compileAndVerifyBinders('<div name="1"></div><div name="2"></div>', '(),1(),2()');
    });

    it('should work for nested elements', function() {
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);

      // all possible combinations of elements with decorators and elements
      // without decorators
      compileAndVerifyBinders('<div><span></span></div>', '()');
      compileAndVerifyBinders('<div name="1"><span></span></div>', '(),1()');
      compileAndVerifyBinders('<div><span name="1"></span></div>', '(),1()');
      compileAndVerifyBinders('<div name="1"><span name="2"></span></div>', '(),1(),2()');
      compileAndVerifyBinders('<div><span name="1"></span><span></span></div>', '(),1()');
      compileAndVerifyBinders('<div><span></span><span name="1"></span></div>', '(),1()');
    });

    it('should set the correct tree levels in the element binders', ()=>{
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);
      compile('<a name="1"><b name="2"></b></a><a name="3"></a>');
      expect(stringifyBinderLevels()).toBe('0,1,2,1');
    });

  });

  describe('compile text nodes', ()=>{
    it('should create TextBinders for text nodes', ()=>{
      createSelector();

      // different combinations of where interpolated text nodes can be
      compileAndVerifyBinders('', '()');
      compileAndVerifyBinders('a', '()');
      compileAndVerifyBinders('{{a}}', '({{a}})');
      compileAndVerifyBinders('<span>a</span>', '()');
      compileAndVerifyBinders('{{a}}<span>{{b}}</span>{{c}}', '({{a}},{{c}}),({{b}})');
      compileAndVerifyBinders('<span>{{a}}</span>', '(),({{a}})');
      compileAndVerifyBinders('<span><div></div>{{a}}</span>', '(),({{a}})');
      compileAndVerifyBinders('<span>{{a}}<div></div>{{b}}</span>', '(),({{a}},{{b}})');
      compileAndVerifyBinders('<span>{{a}}<div>{{b}}</div>{{c}}</span>', '(),({{a}},{{c}}),({{b}})');
    });

    it('should add TextBinders to the right ElementBinders and not just the latest created ElementBinder', ()=>{
      createSelector([ new DecoratorDirective({selector: '[name]'}) ]);

      compileAndVerifyBinders('<span name="1">{{a}}<span name="2"></span>{{b}}</span>', '(),1({{a}},{{b}}),2()');
    });
  });

  describe('compile the template of component directives', () => {

    it('should compile inline templates', ()=>{
      var template = '{{a}}<span name="1">{{b}}</span>';
      createSelector([ 
          new DecoratorDirective({selector: '[name]'}),
          new ComponentDirective({selector: '[comp]', template: template})
      ]);
      compile('<div comp></div>');
      switchToComponentDirective();
      expect($html(nodes)).toBe('{{a}}<span name="1" class="ng-binder">{{b}}</span>');
      verifyBinders('({{a}}),1({{b}})');
    });

    it('should compile with a given component viewFactory', ()=>{
      createSelector([
          new DecoratorDirective({selector: '[name]'})
      ]);
      compile('{{a}}<span name="1">{{b}}</span>');
      var componentViewFactory = new ViewFactory(nodes, binders);

      createSelector([
          new DecoratorDirective({selector: '[name]'}),
          new ComponentDirective({selector: '[comp]', template: componentViewFactory})
      ]);
      compile('<div comp></div>');
      switchToComponentDirective();

      expect($html(nodes)).toBe('{{a}}<span name="1" class="ng-binder">{{b}}</span>');
      verifyBinders('({{a}}),1({{b}})');
    });

  });

  describe('compile template directives', () => {

    it('should work for template directives on a non template element', ()=>{
      createSelector([ 
        new DecoratorDirective({selector: '[name]'}),
        new TemplateDirective({selector: '[tpl]'}) 
      ]);
      // template directive is on root node
      compile('<div tpl>a</div>');
      verifyBinders('(<!--template anchor-->)');
      expect($html(nodes)).toBe('<!--template anchor-->');
      switchToTemplateDirective();
      verifyBinders('()');
      expect($html(nodes)).toBe('<div tpl="">a</div>');
      return;

      // template directive is on child node
      compile('<div><span tpl>a</span></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect($html(nodes)).toBe('<div class="ng-binder"><!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect($html(nodes)).toBe('<span tpl="">a</span>');
      
      // template is after another text node
      compile('<div>a<span tpl>b</span></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect($html(nodes)).toBe('<div class="ng-binder">a<!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect($html(nodes)).toBe('<span tpl="">b</span>');

      // template has other directives on same node
      compile('<div><span tpl name="1">a</span></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect($html(nodes)).toBe('<div class="ng-binder"><!--template anchor--></div>');        
      switchToTemplateDirective();
      verifyBinders('(),1()');
      expect($html(nodes)).toBe('<span tpl="" name="1" class="ng-binder">a</span>');

      // template contains other directives on child elements
      compile('<div tpl=""><span name="1">a</span></div>');
      verifyBinders('(<!--template anchor-->)');
      switchToTemplateDirective();
      verifyBinders('(),1()');
      expect($html(nodes)).toBe('<div tpl=""><span name="1" class="ng-binder">a</span></div>');

    });

    it('should work for template directives on a template elements', ()=>{
      createSelector([ 
        new DecoratorDirective({selector: '[name]'}),
        new TemplateDirective({selector: '[tpl]'}) 
      ]);

      // template directive is on root node
      compile('<template tpl>a</tempate>');
      verifyBinders('(<!--template anchor-->)');
      expect($html(nodes)).toBe('<!--template anchor-->');
      switchToTemplateDirective();
      verifyBinders('()');
      expect($html(nodes)).toBe('a');

      // template directive is on child node
      compile('<div><template tpl>a</template></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect($html(nodes)).toBe('<div class="ng-binder"><!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect($html(nodes)).toBe('a');
      
      // template is after another text node
      compile('<div>a<template tpl>b</template></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect($html(nodes)).toBe('<div class="ng-binder">a<!--template anchor--></div>');
      switchToTemplateDirective();
      verifyBinders('()');
      expect($html(nodes)).toBe('b');
     
      // template has other directives on same node
      // (should be ignored)
      compile('<div><template tpl name="1">a</template></div>');
      verifyBinders('(),(<!--template anchor-->)');
      expect($html(nodes)).toBe('<div class="ng-binder"><!--template anchor--></div>');        
      switchToTemplateDirective();
      verifyBinders('()');
      expect($html(nodes)).toBe('a');

      // template contains other directives on child elements
      compile('<template tpl=""><span name="1">a</span></template>');
      verifyBinders('(<!--template anchor-->)');
      switchToTemplateDirective();
      verifyBinders('(),1()');
      expect($html(nodes)).toBe('<span name="1" class="ng-binder">a</span>');
    });
  });

  function createSelector(directives = []) {    
    attrDirectiveAnnotations = {};
    directives.forEach(function(annotation) {
      var attr = extractAttrSelector(annotation);
      attrDirectiveAnnotations[attr] = annotation;
    });      
    selector = new Selector(directives.map((annotation) => {
      return new DirectiveClass(annotation, function() {});
    }), new CompilerConfig());

    function extractAttrSelector(directiveAnnotation) {
      if (!directiveAnnotation) {
        return null;
      }
      var match = /\[(\w+)\]/.exec(directiveAnnotation.selector);
      if (!match) {
        throw new Error('mock selector only supports attribute names as selector!');
      }
      return match[1];
    }
  }

  function compile(html) {
    inject(Compiler, (compiler)=>{
      nodes = $(html);
      binders = compiler._compile(nodes, selector).elementBinders;
    });
  }

  function stringifyBinders() {
    var structureAsString = [];
    var elements = findBinderElements();

    binders.forEach(function(elementBinder, binderIndex) {
      elementBinder = binders[binderIndex];
      // Note: It's important to select the element
      // only by the index in the binders array
      var element;
      if (binderIndex > 0) {
        element = elements[binderIndex-1];
      } else {
        element = nodes[0] ? nodes[0].parentNode : null;
      }

      var nonElementBindersAsString = [];
      elementBinder.nonElementBinders.forEach(function(nonElementBinder, textIndex) {
        // Note: It's important to select the text/comment node
        // only by the index in the binders array and the indexInParent 
        // of NonElementBinders, as this is what the ViewFactory
        // also does.
        var node = element.childNodes[nonElementBinder.indexInParent];
        var nodeValue = $html(node);
        nonElementBindersAsString.push(nodeValue);
      });
      var annotationValues = '';
      for (var attrName in attrDirectiveAnnotations) {
        if (element && element.getAttribute) {
          var attrValue = element.getAttribute(attrName);
          if (attrValue) {
            annotationValues+=attrValue;
          }          
        }
      }
      structureAsString.push(annotationValues + '(' + nonElementBindersAsString.join(',') + ')');
    });
    return structureAsString.join(',');
  }

  function stringifyBinderLevels() {
    var structureAsString = [];
    var elements = findBinderElements();

    binders.forEach(function(elementBinder, binderIndex) {
      elementBinder = binders[binderIndex];
      structureAsString.push(elementBinder.level);
    });
    return structureAsString.join(',');
  }

  function compileAndVerifyBinders(html, expectedStructureAsString) {
    compile(html);
    verifyBinders(expectedStructureAsString);
  }

  function verifyBinders(expectedStructureAsString) {
    var elements = findBinderElements();
    expect(binders.length).toBe(elements.length+1);
    expect(stringifyBinders()).toBe(expectedStructureAsString);
  }

  function findBinderElements() {
    var res = [], i, ii, node;
    for (i=0, ii=nodes.length; i<ii; i++) {
      node = nodes[i];
      if (node.classList && node.classList.contains('ng-binder')) {
        res.push(node);
      }
      if (node.querySelectorAll) {
        res.push(...node.querySelectorAll('.ng-binder'));        
      } 
    }
    return res;
  }

  function switchToTemplateDirective() {
    var viewFactory;
    binders.forEach(function(binder) {
      if (binder.nonElementBinders) {
        binder.nonElementBinders.forEach(function(nonElementBinder) {
          if (nonElementBinder.template) {
            viewFactory = nonElementBinder.template.viewFactory;
          }
        });
      }
    });
    expect(viewFactory).toBeTruthy();
    // update the global variables
    nodes = viewFactory.templateNodes;
    binders = viewFactory.elementBinders;  
  }

  function switchToComponentDirective() {
    var viewFactory;
    binders.forEach(function(binder) {
      if (binder.component) {
        viewFactory = binder.component.viewFactory;
      }
    });
    expect(viewFactory).toBeTruthy();
    // update the global variables
    nodes = viewFactory.templateNodes;
    binders = viewFactory.elementBinders;  
  }
});
