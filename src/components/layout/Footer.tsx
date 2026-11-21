import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer style={{
     // borderTop: '1px solid #eaeaea',
      padding: '16px',
      textAlign: 'center',
     // backgroundColor: 'rgb(222 222 222)',
      width: '100%',
      flexShrink: 0 // Prevent the footer from shrinking
    }}>
      <div style={{
        maxWidth: '100%',
        margin: '0 8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
       {/* <div style={{ color: '#5E6278', fontSize: '14px' }}>
          <a href="#" style={{ color: '#5E6278', fontSize: '14px', textDecoration: 'none', marginRight: '10px' }}>Help</a> | 
          <a href="#" style={{ color: '#5E6278', fontSize: '14px', textDecoration: 'none', margin: '0 10px' }}>FAQs</a> | 
          <a href="#" style={{ color: '#5E6278', fontSize: '14px', textDecoration: 'none', marginLeft: '10px' }}>User License Agreement</a>
        </div> */}
        <div style={{ color: '#5E6278', fontSize: '16px' }}>
          Powered by <a href="https://1channel.co" target="_blank" rel="noopener noreferrer" style={{ color: '#5E6278', textDecoration: 'none' }}> Channelplay SaaS</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
