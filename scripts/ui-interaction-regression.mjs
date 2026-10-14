import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {transformWithOxc} from 'vite';

// Mounted React tests only: no browser, database writes, uploaded files or mail.
process.env.NODE_ENV='test';
const sourceRoot=process.argv.find(argument=>argument.startsWith('--source-root='))?.slice('--source-root='.length)||process.cwd();
const dom=new JSDOM('<!doctype html><html><body><button id="opener">Open viewer</button><div id="root"></div></body></html>',{url:'http://localhost:5273/'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,CustomEvent:dom.window.CustomEvent,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
window.scrollTo=()=>{};
Object.defineProperty(HTMLElement.prototype,'getClientRects',{value(){return this.closest('[hidden]')?[]:[{width:100,height:40}];},configurable:true});
const idle=[];window.requestIdleCallback=callback=>{idle.push(callback);return idle.length;};window.cancelIdleCallback=()=>{};
const {createElement:h,Component,Fragment,act,useContext,useState}=await import('react');
const {createRoot}=await import('react-dom/client');
const {MemoryRouter}=await import('react-router-dom');
const {LanguageContext}=await import('../src/contexts/LanguageContextCore.js');
const {DataContext}=await import('../src/contexts/DataContextCore.js');
const {DialogContext}=await import('../src/contexts/DialogContextCore.js');
const fixture=JSON.parse(await readFile(new URL('./fixtures/ui-bootstrap.json',import.meta.url),'utf8'));
const file=path=>pathToFileURL(resolve(path)).href;
const common=new Map(['react','react-dom','react-router-dom','react/jsx-runtime','react/jsx-dev-runtime','lucide-react'].map(name=>[name,import.meta.resolve(name)]));
async function moduleUrl(path,imports={}){
 const input=resolve(sourceRoot,path);
 let code=(await transformWithOxc(await readFile(input,'utf8'),input)).code;
 for(const [name,target] of [...common,...Object.entries(imports)])code=code.replaceAll(`"${name}"`,JSON.stringify(target));
 code=code.replaceAll('import.meta.env.PROD','false').replaceAll('import.meta.env.VITE_CMS_ADMIN_URL','"http://localhost:5274"');
 return `data:text/javascript,${encodeURIComponent(code)}`;
}
const storage=file('src/utils/browserStorage.js'),modal=file('src/hooks/useModalFocus.js');
const languageHook=await moduleUrl('src/hooks/useLanguage.js',{'../contexts/LanguageContextCore':file('src/contexts/LanguageContextCore.js')});
const dataHook=await moduleUrl('src/hooks/useData.js',{'../contexts/DataContextCore':file('src/contexts/DataContextCore.js')});
const dialogHook=await moduleUrl('src/hooks/useDialog.js',{'../contexts/DialogContextCore':file('src/contexts/DialogContextCore.js')});
const {LanguageProvider}=await import(await moduleUrl('src/contexts/LanguageContext.jsx',{'./LanguageContextCore':file('src/contexts/LanguageContextCore.js'),'../data/uiLabels':file('src/data/uiLabels.js'),'../utils/browserStorage':storage}));
const {DialogProvider}=await import(await moduleUrl('src/contexts/DialogContext.jsx',{'./DialogContextCore':file('src/contexts/DialogContextCore.js'),'../hooks/useLanguage':languageHook,'../hooks/useModalFocus':modal}));
const {default:Lightbox}=await import(await moduleUrl('src/components/media/Lightbox.jsx',{'../../hooks/useLanguage':languageHook,'../../hooks/useModalFocus':modal}));
const scrollStub=`data:text/javascript,${encodeURIComponent('export const scrollToTarget=()=>{};')}`;
const {default:TopBar}=await import(await moduleUrl('src/components/navbar/TopBar.jsx',{'../../hooks/useData':dataHook,'../../hooks/useLanguage':languageHook,'../../hooks/useDialog':dialogHook,'../../utils/scroll':scrollStub,'../../utils/browserStorage':storage,'../../hooks/useModalFocus':modal}));
const apiStub=`data:text/javascript,${encodeURIComponent('export const clearCmsCache=()=>{};export const subscribeCmsUpdates=()=>()=>{};export const getCmsVersion=async()=>"test-version";export const getCmsBootstrap=async language=>({...globalThis.__uiFixture,language,contentVersion:"test-version"});')}`;
globalThis.__uiFixture=fixture;
const {DataProvider}=await import(await moduleUrl('src/contexts/DataContext.jsx',{'../hooks/useLanguage':languageHook,'../data/customCmsClient':apiStub,'../data/uiLabels':file('src/data/uiLabels.js'),'./DataContextCore':file('src/contexts/DataContextCore.js'),'../utils/browserStorage':storage}));
class Boundary extends Component{state={error:null};static getDerivedStateFromError(error){return {error};}render(){return this.state.error?h('p',{id:'caught-error'},this.state.error.message):this.props.children;}}
let root;
const mount=async element=>{if(root)await act(()=>root.unmount());root=createRoot(document.getElementById('root'),{onCaughtError(){}});await act(()=>root.render(h(Boundary,null,element)));};
const key=async(name,shiftKey=false)=>act(()=>document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown',{key:name,shiftKey,bubbles:true,cancelable:true})));
const button=name=>Array.from(document.querySelectorAll('button')).find(item=>item.getAttribute('aria-label')===name||item.textContent.trim()===name);
const language={language:'en',isHindi:false,t:text=>text,setLanguage(){}};
const withLanguage=child=>h(LanguageContext.Provider,{value:language},child);
const storageDescriptors=new Map(['localStorage','sessionStorage'].map(name=>[name,Object.getOwnPropertyDescriptor(window,name)]));
const blockStorage=()=>{for(const name of storageDescriptors.keys())Object.defineProperty(window,name,{configurable:true,get(){throw new window.DOMException('Browser storage is blocked','SecurityError');}});};
const restoreStorage=()=>{for(const [name,descriptor] of storageDescriptors)Object.defineProperty(window,name,descriptor);};
const failures=[];
async function test(name,run){try{await run();console.log(`PASS ${name}`);}catch(error){failures.push(name);console.error(`FAIL ${name}: ${error.message.slice(0,240)}`);}finally{restoreStorage();if(root){await act(()=>root.unmount());root=null;}document.body.style.overflow='';idle.length=0;}}

await test('Gallery focus, keyboard navigation, focus return and previous scroll lock',async()=>{
 let closed=0;const photos=[{src:'/one.jpg',caption:'One'},{src:'/two.jpg',caption:'Two'}];
 document.body.style.overflow='clip';document.getElementById('opener').focus();
 function Viewer(){const [open,setOpen]=useState(true);return withLanguage(open?h(Lightbox,{images:photos,startIndex:0,onClose:()=>{closed++;setOpen(false);}}):null);}
 await mount(h(Viewer));assert.ok(document.activeElement===button('Close'),'Opening the viewer must focus its controls');
 await key('Tab',true);assert.ok(document.activeElement===button('Next'),'Reverse Tab must wrap to the final viewer control');
 await key('Tab');assert.ok(document.activeElement===button('Close'),'Tab must wrap to the first viewer control');
 await key('ArrowRight');assert.equal(document.querySelector('[role=dialog] img').getAttribute('src'),'/two.jpg');
 await key('ArrowRight');assert.equal(document.querySelector('[role=dialog] img').getAttribute('src'),'/one.jpg');
 await key('Escape');assert.equal(closed,1);assert.equal(document.querySelector('[role=dialog]'),null);
 assert.equal(document.activeElement.id,'opener');assert.equal(document.body.style.overflow,'clip');
});
await test('Empty/changing galleries do not freeze scrolling or render an invalid image',async()=>{
 await mount(withLanguage(h(Lightbox,{images:[],onClose(){}})));assert.equal(document.body.style.overflow,'');
 await mount(withLanguage(h(Lightbox,{images:[{src:'/one.jpg'},{src:'/two.jpg'}],startIndex:99,onClose(){}})));
 assert.equal(document.querySelector('[role=dialog] img').getAttribute('src'),'/two.jpg');
 await act(()=>root.render(withLanguage(h(Lightbox,{images:[{src:'/one.jpg'}],startIndex:99,onClose(){}}))));
 assert.equal(document.querySelector('[role=dialog] img').getAttribute('src'),'/one.jpg');
 await act(()=>root.render(withLanguage(h(Lightbox,{images:[],onClose(){}}))));assert.equal(document.body.style.overflow,'');
});
await test('Hindi/document/external-link dialogs retain keyboard focus and restore the opener',async()=>{
 let dialog;function Probe(){dialog=useContext(DialogContext);return h(Fragment,null,h('button',{id:'dialog-opener',onClick:()=>dialog.requestLanguageChange('hi')},'Hindi'),h('a',{id:'external-opener',href:'https://example.org'},'External website'));}
 await mount(withLanguage(h(DialogProvider,null,h(Probe))));document.getElementById('dialog-opener').focus();await act(()=>document.getElementById('dialog-opener').click());
 assert.ok(document.activeElement===button('Stay in English'),'Language dialog must focus its controls');await key('Tab',true);assert.ok(document.activeElement===button('Switch to Hindi'),'Language dialog must contain keyboard focus');
 await key('Escape');assert.equal(document.activeElement.id,'dialog-opener');assert.equal(document.body.style.overflow,'');
 await act(()=>dialog.openDocument({url:'/example.pdf',title:'Document test'}));assert.ok(document.querySelector('[role=dialog] iframe'));
 assert.ok(document.querySelector('[role=dialog]').contains(document.activeElement));await key('Escape');assert.equal(document.activeElement.id,'dialog-opener');
 document.getElementById('external-opener').focus();await act(()=>document.getElementById('external-opener').click());
 assert.ok(document.activeElement===button('Cancel'),'External link disclaimer must focus its controls');
 await key('Escape');assert.equal(document.activeElement.id,'external-opener');
});
await test('Language and accessibility controls stay usable with browser storage blocked',async()=>{
 blockStorage();let context;
 function Probe(){context=useContext(LanguageContext);return h('span',{id:'language-probe'},context.language);}
 await mount(h(LanguageProvider,null,h(Probe)));
 assert.equal(document.getElementById('language-probe')?.textContent,'en','Blocked storage must not crash the provider');
 await act(()=>context.setLanguage('hi'));assert.equal(document.documentElement.lang,'hi');assert.equal(new URL(window.location.href).searchParams.get('lang'),'hi');
 window.history.replaceState(null,'','/?lang=en');
 await mount(h(MemoryRouter,null,h(LanguageProvider,null,h(DataContext.Provider,{value:fixture},h(DialogContext.Provider,{value:{requestLanguageChange(){}}},h(TopBar))))));
 assert.equal(document.getElementById('caught-error'),null,'Blocked storage must not crash the header');
 await act(()=>button('Increase text size').click());assert.equal(document.documentElement.style.fontSize,'17px');
 await act(()=>button('Toggle high contrast mode').click());assert.ok(document.documentElement.classList.contains('rsac-high-contrast'));
 await act(()=>button('Display options').click());assert.ok(document.getElementById('display-options-title'));
 const searchOpener=button('Open site search');searchOpener.focus();await act(()=>searchOpener.click());
 const search=document.querySelector('[role=dialog][aria-modal=true]');assert.ok(search);
 const searchControls=Array.from(search.querySelectorAll('button,input,a[href]')).filter(element=>element.tabIndex>=0);
 searchControls[0].focus();await key('Tab',true);assert.ok(document.activeElement===searchControls.at(-1),'Search keyboard focus must not leave the modal');
 await key('Escape');assert.equal(document.documentElement.classList.contains('rsac-search-open'),false);
 assert.ok(document.activeElement===searchOpener,'Closing search must return focus to its opener');
});
await test('Invalid saved text-size values recover and text-size buttons respond',async()=>{
 for(const value of ['garbage','99','-1','1.5','']){
  window.localStorage.setItem('rsac.fontSizeIndex',value);
  await mount(h(MemoryRouter,null,withLanguage(h(DataContext.Provider,{value:fixture},h(DialogContext.Provider,{value:{requestLanguageChange(){}}},h(TopBar))))));
  assert.equal(document.documentElement.style.fontSize,'16px',`Invalid index ${value} did not recover`);
  await act(()=>button('Increase text size').click());assert.equal(document.documentElement.style.fontSize,'17px');
 }
});
await test('CMS content still renders when both cache write and cleanup are denied',async()=>{
 blockStorage();await mount(withLanguage(h(DataProvider,null,h('span',{id:'content-probe'},'Loaded content'))));
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});
 assert.ok(document.getElementById('content-probe'));
 await act(async()=>{for(const callback of idle.splice(0))callback();});
 assert.ok(document.getElementById('content-probe'));
});
dom.window.close();delete globalThis.__uiFixture;
assert.equal(failures.length,0,`${failures.length} UI scenarios failed: ${failures.join('; ')}`);
console.log('Six mounted UI scenarios passed; no live data, API or uploads were changed.');
