/* Lueri International — Lucy loader v3 */
(function(){'use strict';
  const load=()=>{
    if(document.querySelector('script[data-lucy-ui-v3]')) return;
    const script=document.createElement('script');
    script.src='lucy-ui-v3.js';
    script.dataset.lucyUiV3='true';
    document.head.appendChild(script);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
