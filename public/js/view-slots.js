// Listen to view-slots filtering submissions
document.getElementById('view-slots-form').addEventListener('submit', async (e) => {
      e.preventDefault();


      const form = e.target;
      // make a query string from the form to fecth the correct filtered data
      const params = new URLSearchParams(new FormData(form)).toString();
      const container = document.getElementById('slotsContainer');
      
      try { 
        container.innerHTML = '<div class="loading">Loading seat availability...</div>';

        //fetch the slots using AJAX to avoid reloading the whole page
        const response = await fetch(`/reservations/availability?${params}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (!response.ok) throw new Error('Server error');
        
        // put to container the new html 
        const html = await response.text();
        container.innerHTML = html;

      } catch (error) {
        // reload page button if there is a fetching error
        console.error('Fetch error:', error);
        container.innerHTML = `
          <div class="error">
            <p>Error loading data. Please try again.</p>
            <button onclick="location.reload()">Reload Page</button>
          </div>
        `;
      }
    });

    // Set default date to today
    document.addEventListener('DOMContentLoaded', () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      document.getElementById('date').value = `${year}-${month}-${day}`;
    });
