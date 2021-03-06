import {use, inject} from 'di/testing';
import {ViewPort, View} from '../src/view';
import {$, $html} from './dom_mocks';

describe('View', () => {
  var viewPort;
  var $rootElement;
  var anchorHtml = '<!-- anchor -->', 
      aHtml = '<span>A</span>a', 
      bHtml = '<span>B</span>b',
      cHtml = '<span>C</span>c',
      dHtml = '<span>D</span>d',
      anchor, a, b, c, d;

  beforeEach(() => {
    $rootElement = $(anchorHtml);
    anchor = $rootElement[0];
    viewPort = new ViewPort(anchor);
    a = new View($(aHtml), null);
    b = new View($(bHtml), null);
    c = new View($(cHtml), null);
    d = new View($(dHtml), null);
  });

  function expectChildNodesToEqual(nodes) {
    var str = nodes.join('');
    expect($html($rootElement)).toEqual(nodes.join(''));
  }

  it('should ignore changes to the original node list', () => {
    var originalList = Array.prototype.slice.call($('<div></div>'));
    var v = new View(originalList, null);
    originalList.splice(0, 1);
    expect(originalList.length).toBe(0);
    expect(v.nodes.length).toBe(1);
  });

  describe('append', () => {
    it('should append in empty hole', () => {
      viewPort.append(a);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });

    it('should append in non empty hole', () => {
      viewPort.append(a);
      viewPort.append(b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

  });

  describe('prepend', () => {

    it('should prepend in empty hole', () => {
      viewPort.prepend(a);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });
  
    it('should prepend in non empty hole', () => {
      viewPort.prepend(b);
      viewPort.prepend(a);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

  });

  describe('insertBefore', () => {

    it('should insert before head', () => {
      viewPort.append(b);
      viewPort.insertBefore(a,b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should insert before other element', () => {
      viewPort.append(a);
      viewPort.append(c);
      viewPort.insertBefore(b,c);
      
      expectChildNodesToEqual([aHtml, bHtml, cHtml, anchorHtml]);
    });

  });

  describe('insertAfter', () => {

    it('should insert after tail', () => {
      viewPort.append(a);
      viewPort.insertAfter(b,a);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should insert before other element', () => {
      viewPort.append(a);
      viewPort.append(c);
      viewPort.insertAfter(b,a);
      
      expectChildNodesToEqual([aHtml, bHtml, cHtml, anchorHtml]);
    });

  });

  describe('remove', () => {
    it('should remove the only item in a hole', () => {
      viewPort.append(a);
      viewPort.remove(a);

      expectChildNodesToEqual([anchorHtml]);
    });

    it('should remove the last item of a hole', () => {
      viewPort.append(a);
      viewPort.append(b);
      viewPort.remove(b);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });

    it('should remove the first item of a hole', () => {
      viewPort.append(a);
      viewPort.append(b);
      viewPort.remove(a);

      expectChildNodesToEqual([bHtml, anchorHtml]);
    });
  });

  describe('move', () => {
    it('should switch head and tail', () => {
      viewPort.append(b);
      viewPort.append(a);
      viewPort.insertBefore(a, b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should move an element in the hole', () => {
      viewPort.append(a);
      viewPort.append(c);
      viewPort.append(b);
      viewPort.append(d);
      viewPort.insertBefore(b,c);

      expectChildNodesToEqual([aHtml, bHtml, cHtml, dHtml, anchorHtml]);
    });

  });    
});
