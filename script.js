// -------------Client Names should be in Title Case and upto 8 Characters-----------------
function formatClientName(name) {
    // Ensure name is in title case
    const titleCasedName = name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  
    // Truncate to 8 characters if necessary
    return titleCasedName.length > 8 ? titleCasedName.substring(0, 8) : titleCasedName;
  }
   
let apiDataCache = null;

// --------loader----------
// Show the loader
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
}

// Hide the loader
function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

// Call showLoader on page load
window.addEventListener('load', () => {
    showLoader(); // Show loader on page load
});

// Fetch API Data
async function fetchData() {
    try {
        const response = await fetch('http://180.179.103.237/retailer_dev/api/mis_api.php');
        apiDataCache = await response.json();
        if (!apiDataCache) {
            throw new Error("Failed to fetch API data.");
        }
        displayData('1', '1', processGroupData(apiDataCache));
        hideLoader(); // Hide loader after data is processed
    } catch (error) {
        console.error("Error fetching data:", error);
        hideLoader(); // Hide loader even if an error occurs
    }
}

// Process API Data to Group Level
function processGroupData(apiData) {
    const groupData = {};

    for (const clientId in apiData) {
        const client = apiData[clientId];
        
        const groupId = parseInt(client.mtd?.group_id || client.lmtd?.group_id || Object.values(client.lytd || {})[0]?.group_id || 0);
        
        let groupName = client.mtd?.group_name || client.lmtd?.group_name || Object.values(client.lytd || {})[0]?.group_name || "N/A";
        
        const clientName = client.mtd?.client_name || client.lmtd?.client_name || Object.values(client.lytd || {})[0]?.client_name || "N/A";

        const dispName = client.mtd?.disp_name || client.lmtd?.disp_name || Object.values(client.lytd || {})[0]?.disp_name || "N/A";

        const IdClient = parseInt(client.mtd?.client_id || client.lmtd?.client_id || Object.values(client.lytd || {})[0]?.client_id || 0); 

        // Assign clientName to groupName if groupId is 0 and no group name exists
        if (groupId === 0 && !client.lmtd?.group_name) {
            groupName = clientName;
        }

        // Initialize group data if it doesn't exist
        if (!groupData[groupId]) {
            groupData[groupId] = {
                groupIds: groupId,
                dispNames: dispName,
                groupName: groupName,
                totalBillPaid: 0,
                totalBillCount: 0,
                clients: {}
            };
        }

        // Handle groupId === 0 and unique client-specific data
        if (groupId === 0 && !groupData[clientId]) {
            let lmtdBillPaid = parseFloat(client.lmtd?.bill_paid || 0);
            let lmtdBillCount = parseInt(client.lmtd?.bill_paid_count || 0);

            groupData[clientId] = {
                groupIds: groupId,
                groupName: clientName,
                totalBillPaid: lmtdBillPaid,
                totalBillCount: lmtdBillCount,
                clients: {
                    [clientName]: {
                        mtd: client.mtd
                            ? {
                                bill_paid: parseFloat(client.mtd.bill_paid || 0),
                                bill_paid_count: parseInt(client.mtd.bill_paid_count || 0)
                            }
                            : { bill_paid: 0, bill_paid_count: 0 },
                        lmtd: {
                            bill_paid: lmtdBillPaid,
                            bill_paid_count: lmtdBillCount
                        },
                        lytd: {}
                    }
                }
            };

            // Include lytd data if available
            for (const monthYear in client.lytd || {}) {
                const monthData = client.lytd[monthYear];
                groupData[clientId].clients[clientName].lytd[monthYear] = {
                    bill_paid: parseFloat(monthData.bill_paid || 0),
                    bill_paid_count: parseInt(monthData.bill_paid_count || 0)
                };
            }
            continue; // Skip further processing for groupId === 0 and unique clients
        }


        // Initialize client in the group if not already present
        if (!groupData[groupId].clients[clientName]) {
            groupData[groupId].clients[clientName] = {
                mtd: { bill_paid: 0, bill_paid_count: 0 },
                lmtd: { bill_paid: 0, bill_paid_count: 0 },
                lytd: {}
            };
        }

        // Accumulate MTD data
        if (client.mtd) {
            const mtdBillPaid = parseFloat(client.mtd.bill_paid || 0);
            const mtdBillCount = parseInt(client.mtd.bill_paid_count || 0);

            groupData[groupId].totalBillPaid += mtdBillPaid;
            groupData[groupId].totalBillCount += mtdBillCount;

            groupData[groupId].clients[clientName].mtd.bill_paid += mtdBillPaid;
            groupData[groupId].clients[clientName].mtd.bill_paid_count += mtdBillCount;
        }

        // Accumulate LMTD data
        if (client.lmtd) {
            const lmtdBillPaid = parseFloat(client.lmtd.bill_paid || 0);
            const lmtdBillCount = parseInt(client.lmtd.bill_paid_count || 0);

            groupData[groupId].totalBillPaid += lmtdBillPaid;
            groupData[groupId].totalBillCount += lmtdBillCount;

            groupData[groupId].clients[clientName].lmtd.bill_paid += lmtdBillPaid;
            groupData[groupId].clients[clientName].lmtd.bill_paid_count += lmtdBillCount;
        }

        // Accumulate LYTD data
        for (const monthYear in client.lytd || {}) {
            const monthData = client.lytd[monthYear];
            const lytdBillPaid = parseFloat(monthData.bill_paid || 0);
            const lytdBillCount = parseInt(monthData.bill_paid_count || 0);

            groupData[groupId].totalBillPaid += lytdBillPaid;
            groupData[groupId].totalBillCount += lytdBillCount;

            if (!groupData[groupId].clients[clientName].lytd[monthYear]) {
                groupData[groupId].clients[clientName].lytd[monthYear] = {
                    bill_paid: 0,
                    bill_paid_count: 0
                };
            }
            groupData[groupId].clients[clientName].lytd[monthYear].bill_paid += lytdBillPaid;
            groupData[groupId].clients[clientName].lytd[monthYear].bill_paid_count += lytdBillCount;
        }
    }
    return groupData;
}

// --------------for amount comma sepeared---
const formatIndianNumber = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

let currentFilterType = '1'; // Default filter type
let currentDisplayType = '1'; // Default display type

// Function to display data
function displayData(filterType = '1', displayType = '1', groupData) {
    const tableBody = document.getElementById('tableBody');
    const totalRow = document.getElementById('totalRow');
    tableBody.innerHTML = '';
    totalRow.innerHTML = '<th>Total</th>';

    //Store the current filter and display types
    currentFilterType = filterType;
    currentDisplayType = displayType;

    // Initialize the total sums for the entire table
    let totalMTDBill = 0;
    let totalMTDBillCount = 0;
    let totalLMTDBill = 0;
    let totalLMTDBillCount = 0;
    let totalAvglastbill = 0;
    let totalAvglastCount = 0;

    const totalMonthlyBills = {
        'Sep': 0, 'Aug': 0, 'Jul': 0, 'Jun': 0, 'May': 0,
        'Apr': 0, 'Mar': 0, 'Feb': 0, 'Jan': 0, 'Dec': 0,
        'Nov': 0, 'Oct': 0
    };

    const totalMonthlyCounts = {
        'Sep': 0, 'Aug': 0, 'Jul': 0, 'Jun': 0, 'May': 0,
        'Apr': 0, 'Mar': 0, 'Feb': 0, 'Jan': 0, 'Dec': 0,
        'Nov': 0, 'Oct': 0
    };

     // SORT groupData based on lmtd, and then mtd
        const sortedGroupData = Object.entries(groupData).sort((a, b) => {
            const groupA = a[1];
            const groupB = b[1];

            const lmtdBillA = Object.values(groupA.clients).reduce((sum, client) => sum + (client.lmtd.bill_paid || 0), 0);
            const lmtdBillB = Object.values(groupB.clients).reduce((sum, client) => sum + (client.lmtd.bill_paid || 0), 0);

            const mtdBillA = Object.values(groupA.clients).reduce((sum, client) => sum + (client.mtd.bill_paid || 0), 0);
            const mtdBillB = Object.values(groupB.clients).reduce((sum, client) => sum + (client.mtd.bill_paid || 0), 0);

            const avgBillA = Object.values(groupA.clients).reduce((sum, client) => {
                const billMonths = Object.values(client.lytd).map(data => data.bill_paid || 0);
                return sum + (billMonths.length ? billMonths.reduce((a, b) => a + b, 0) / billMonths.length : 0);
            }, 0);

            const avgBillB = Object.values(groupB.clients).reduce((sum, client) => {
                const billMonths = Object.values(client.lytd).map(data => data.bill_paid || 0);
                return sum + (billMonths.length ? billMonths.reduce((a, b) => a + b, 0) / billMonths.length : 0);
            }, 0);

            // Sorting logic: LMTD -> MTD -> Average
            if (lmtdBillB !== lmtdBillA) return lmtdBillB - lmtdBillA;
            if (mtdBillB !== mtdBillA) return mtdBillB - mtdBillA;
            return avgBillB - avgBillA;
        });  

    for (const [groupId, group] of sortedGroupData){
        const group = groupData[groupId];

        // Initialize group totals for individual group
        let groupMTDBill = 0;
        let groupMTDBillCount = 0;
        let groupLMTDBill = 0;
        let groupLMTDBillCount = 0;

        // Calculate group averages
        let groupAvgBillSum = 0;
        let groupAvgCountSum = 0;
        let nonZeroBillMonths = 0;
        let nonZeroCountMonths = 0;

        const months = {
            'Sep': { bill: 0, count: 0 }, 'Aug': { bill: 0, count: 0 },
            'Jul': { bill: 0, count: 0 }, 'Jun': { bill: 0, count: 0 },
            'May': { bill: 0, count: 0 }, 'Apr': { bill: 0, count: 0 },
            'Mar': { bill: 0, count: 0 }, 'Feb': { bill: 0, count: 0 },
            'Jan': { bill: 0, count: 0 }, 'Dec': { bill: 0, count: 0 },
            'Nov': { bill: 0, count: 0 }, 'Oct': { bill: 0, count: 0 }
        };

        // Iterate over each client inside the group
        Object.values(group.clients).forEach(client => {
            const mtdBill = (client.mtd.bill_paid / 100000).toFixed(2);
            const mtdCount = client.mtd.bill_paid_count;
            const lmtdBill = (client.lmtd.bill_paid / 100000).toFixed(2);
            const lmtdCount = client.lmtd.bill_paid_count;

            // Process monthly data
            for (const [monthYear, lytdData] of Object.entries(client.lytd)) {
                const month = monthYear.slice(0, 3); // Extract month abbreviation
                if (months[month]) {
                    months[month].bill += parseFloat(lytdData.bill_paid || 0) / 100000;
                    months[month].count += parseInt(lytdData.bill_paid_count || 0);
                }
            }

            // Add group data to group totals
            groupMTDBill += parseFloat(mtdBill) || 0;
            groupMTDBillCount += parseInt(mtdCount) || 0;
            groupLMTDBill += parseFloat(lmtdBill) || 0;
            groupLMTDBillCount += parseInt(lmtdCount) || 0;
        });

        // Iterate through months to calculate sums and counts average
            Object.keys(months).forEach(month => {
                if (months[month].bill > 0) {
                    groupAvgBillSum += months[month].bill;
                    nonZeroBillMonths++;
                }
                if (months[month].count > 0) {
                    groupAvgCountSum += months[month].count;
                    nonZeroCountMonths++;
                }
            });

            // Final average values
            const finalAvgBill = nonZeroBillMonths > 0 ? (groupAvgBillSum / nonZeroBillMonths).toFixed(2) : '0.00';
            const finalAvgCount = nonZeroCountMonths > 0 ? Math.round(groupAvgCountSum / nonZeroCountMonths) : 0;

         // Accumulate the total averages for all groups
                totalAvglastbill += parseFloat(finalAvgBill) || 0;
                totalAvglastCount += parseInt(finalAvgCount) || 0;

        // Replace 0 with '--' in all relevant fields for filterType=== 2
           function formatValue(value) {
            const numericValue = parseFloat(value) || 0;
        
            if (currentFilterType === '2') {
                return numericValue === 0 ? '--' : value;
            } else if (currentFilterType === '3') {
                return numericValue === 0 ? '0' : '--';
            }
            return value; // For currentFilterType === '1'
        }

        // Create a new table row for each group
        const row = document.createElement('tr');
        
        var table = ``;
        if (group.groupIds != 0) {
            table += 
            `<td class="client_name"><a href="#" data-bs-toggle="tooltip" data-bs-placement="top" title="${(group.groupName)}" onclick="showClientDetails('${groupId}')">${formatClientName(group.groupName)}</a>
            </td>`;
           
        } else if (groupId == '0' || groupId == '543' || groupId == '534') {
            continue;
        } else {
            table += `
            <td class="client_name" data-bs-toggle="tooltip" data-bs-placement="top" title="${(group.groupName)}">
                ${formatClientName(group.groupName)}
            </td>`; 
        }
        
        table +=  `<td class="${parseFloat(groupMTDBill) >= parseFloat(groupLMTDBill) ? 'text-success' : 'text-danger'}">
                        ${displayType === '1' ? formatValue(groupMTDBill !== "" ? formatIndianNumber(groupMTDBill) : "", filterType, parseFloat(groupMTDBill) === 0) : ""}
                        <span class= "${parseFloat(groupMTDBillCount) >= parseFloat(groupLMTDBillCount) ? 'text-success' : 'text-danger'}">
                        ${displayType === '2' ? formatValue(groupMTDBillCount !== "" ? groupMTDBillCount.toLocaleString() : "", filterType, parseInt(groupMTDBillCount) === 0) : ""} </span>
                        ${displayType === '3' ? `
                            ${formatValue(groupMTDBill !== "" ? formatIndianNumber(groupMTDBill) : "", filterType, parseFloat(groupMTDBill) === 0)}
                            <br>
                            <span class="count-font">
                                (${formatValue(groupMTDBillCount !== "" ? groupMTDBillCount.toLocaleString() : "", filterType, parseInt(groupMTDBillCount) === 0)})
                            </span>` : ""}
                    </td>
  
                    <td>
                        ${displayType === '1' ? formatValue(groupLMTDBill !== "" ? formatIndianNumber(groupLMTDBill) : "", filterType, parseFloat(groupLMTDBill) === 0) : ""}
                        ${displayType === '2' ? formatValue(groupLMTDBillCount !== "" ? groupLMTDBillCount.toLocaleString() : "", filterType, parseInt(groupLMTDBillCount) === 0) : ""}
                        ${displayType === '3' ? `
                            ${formatValue(groupLMTDBill !== "" ? formatIndianNumber(groupLMTDBill) : "", filterType, parseFloat(groupLMTDBill) === 0)}
                            <br>
                            <span class="count-font">
                                (${formatValue(groupLMTDBillCount !== "" ? groupLMTDBillCount.toLocaleString() : "", filterType, parseInt(groupLMTDBillCount) === 0)})
                            </span>` : ""}
                    </td>

                    ${orderedMonths.map(month => `
                        <td class="${parseFloat(months[month].bill) >= parseFloat(finalAvgBill) ? 'text-success' : 'text-danger'}">
                            ${displayType === '1' ? formatValue(months[month].bill !== "" ? formatIndianNumber(months[month].bill) : "", filterType, displayType) : ""}
                            <span class="${parseFloat(months[month].count) >= parseFloat(finalAvgCount) ? 'text-success' : 'text-danger'}">
                            ${displayType === '2' ? formatValue(months[month].count !== "" ? months[month].count.toLocaleString() : "", filterType, displayType) : ""} </span>
                            ${displayType === '3' ? `
                                ${formatValue(months[month].bill !== "" ? formatIndianNumber(months[month].bill) : "", filterType, displayType)}
                                <br>
                                <span class="count-font">(${formatValue(months[month].count !== "" ? months[month].count.toLocaleString() : "", filterType, displayType)})</span>
                            ` : ""}
                        </td>
                    `).join('')}

                <td>
                    ${displayType === '1' ? (filterType === '3' ? '0' : formatIndianNumber(finalAvgBill)) : "" }
                    ${displayType === '2' ? (filterType === '3' ? '0' : `${finalAvgCount.toLocaleString()}`) : ""}

                    ${displayType === '3' ? `${filterType === '3' ? '0.00' : formatIndianNumber(finalAvgBill)}<br><span class="count-font">(${filterType === '3' ? '0' : finalAvgCount.toLocaleString()})</span>`: ""  }
                </td> 
       ` ; 

         row.innerHTML = table;
        tableBody.appendChild(row);

        // -------for tooltip------
        function initializeTooltips() {
            var tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }
        
        // Reinitialize tooltips after updating the table
        initializeTooltips();
        
       // Update total values
       totalMTDBill += groupMTDBill;
       totalMTDBillCount += groupMTDBillCount;
       totalLMTDBill += groupLMTDBill;
       totalLMTDBillCount += groupLMTDBillCount;

       // Add monthly data to group totals
       Object.keys(months).forEach(month => {
        totalMonthlyBills[month] += parseFloat(months[month].bill) || 0;
        totalMonthlyCounts[month] += parseInt(months[month].count) || 0;
    });
    }

    // Create the total row
    const totalRowHTML = `
        <td class="total-field"><strong>Total</strong></td>
                        <td class="${parseFloat(totalMTDBill) >= parseFloat(totalLMTDBill) ? 'text-success' : 'text-danger'}">
                            ${displayType === '1' ? (filterType === '3' ? '0.00' : formatIndianNumber(totalMTDBill) ) : ""}
                            <span class="${parseFloat(totalMTDBillCount) >= parseFloat(totalLMTDBillCount) ? 'text-success' : 'text-danger'}">${displayType === '2' ? (filterType === '3' ? '0' : `${totalMTDBillCount.toLocaleString()}`) : ""}</span>
                            ${displayType === '3' ? `
                              <span class="${parseFloat(totalMTDBill) >= parseFloat(totalLMTDBill) ? 'text-success' : 'text-danger'}">${filterType === '3' ? '0.00' : formatIndianNumber(totalMTDBill)}</span>
                                <br>
                                <span class="count-font">
                                    (${filterType === '3' ? '0' : totalMTDBillCount.toLocaleString()})
                                </span>
                            ` : ""}
                        </td>
                        
                        <td>
                            ${displayType === '1' ? (filterType === '3' ? '0.00' : formatIndianNumber(totalLMTDBill)) : ""}
                            ${displayType === '2' ? (filterType === '3' ? '0' : `${totalLMTDBillCount.toLocaleString()}`) : ""}
                            ${displayType === '3' ? `
                                ${filterType === '3' ? '0.00' : formatIndianNumber(totalLMTDBill)}
                                <br>
                                <span class="count-font">
                                    (${filterType === '3' ? '0' : totalLMTDBillCount.toLocaleString()})
                                </span>
                            ` : ""}
                        </td>

                        ${orderedMonths.map(month => `
                            <td class="${(totalMonthlyBills[month]) >= totalAvglastbill ? 'text-success' : 'text-danger'}">
                                ${displayType === '1' ? (filterType === '3' ? '0.00' : formatIndianNumber(totalMonthlyBills[month])) : ""} 
                                <span class="${parseFloat((totalMonthlyCounts[month])) > parseFloat(totalAvglastCount) ? 'text-success' : 'text-danger'}" >
                                ${displayType === '2' ? (filterType === '3' ? '0' : `${totalMonthlyCounts[month].toLocaleString()}`) : ""} </span>
                                ${displayType === '3' ? `<span class ="${parseFloat((totalMonthlyBills[month])) > parseFloat(totalAvglastbill) ? 'text-success' : 'text-danger'}" >
                                    ${filterType === '3' ? '0.00' : formatIndianNumber(totalMonthlyBills[month])}
                                    <br>
                                    <span class="count-font">
                                        (${filterType === '3' ? '0' : totalMonthlyCounts[month].toLocaleString()})
                                    </span></span>
                                ` : ""}
                            </td>
                        `).join('')}
                        
                        <td>
                            ${displayType === '1' ? (filterType === '3' ? '0.00' : formatIndianNumber(totalAvglastbill)) : ""}
                            ${displayType === '2' ? (filterType === '3' ? '0' : `${totalAvglastCount.toLocaleString()}`) : ""}
                            ${displayType === '3' ? `
                                ${filterType === '3' ? '0.00' : formatIndianNumber(totalAvglastbill)}
                                <br>
                                <span class="count-font">
                                    (${filterType === '3' ? '0.00' : totalAvglastCount.toLocaleString()})
                                </span>
                            ` : ""}
                        </td>
    `;  
    totalRow.innerHTML = totalRowHTML;
}
document.addEventListener("DOMContentLoaded", function () {
    initializeTooltips();
});

function initializeTooltips() {
    var tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

// Event listener for search
document.getElementById('searchButton').addEventListener('click', () => {
    const filterType = document.getElementById('filterSelect').value;
    const displayType = document.getElementById('valueSelect').value;
    displayData(filterType, displayType, processGroupData(apiDataCache));
});

function initializeMonths() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = new Date().getMonth();
    const orderedMonths = [
        ...months.slice(currentMonthIndex).reverse(), // From current month backward till Jan
        ...months.slice(0, currentMonthIndex).reverse(), // From Dec back to the current month
    ];

    const monthData = {};
    orderedMonths.forEach(month => {
        monthData[month] = { bill: 0, count: 0 };
    });

    return monthData;
}

// Event listener for search for subclient data
function showClientDetails(groupId) {
    const tableBody = document.getElementById('subclientTableBody');
    tableBody.innerHTML = '';
    const subtotalRow = document.getElementById('subtotalRow');
    subtotalRow.innerHTML = '<th scope="row" class="total-field" style="font-size:15px;">Total</th>'; // Reset subtotal row with initial "Total" label

    const groupClients = Object.values(apiDataCache).filter(client => {
        // Safely access properties and handle cases where they might be undefined
        const groupIdFromLmtd = client.lmtd?.group_id;
        const groupIdFromMtd = client.mtd?.group_id;
    
        // Check if client.lytd is defined and is an object before accessing its values
        const groupIdFromClientLytd = client.lytd && typeof client.lytd === 'object' ? Object.values(client.lytd)[0]?.group_id : undefined;
    
        const groupIdFromLytd = client.lytd?.group_id; 
        // Return true if any of the group IDs match the provided groupId
        return (
            groupIdFromLmtd == groupId || 
            groupIdFromMtd == groupId || 
            groupIdFromLytd == groupId || 
            groupIdFromClientLytd == groupId
        );
    });
    
     // Sort clients based on LMTD bill_paid in descending order, and use MTD bill_paid as a tiebreaker
    groupClients.sort((a, b) => {
        const lmtdA = parseFloat(a.lmtd?.bill_paid || 0);
        const lmtdB = parseFloat(b.lmtd?.bill_paid || 0);
    
        const mtdA = parseFloat(a.mtd?.bill_paid || 0);
        const mtdB = parseFloat(b.mtd?.bill_paid || 0);
    
        let avgA = 0, avgB = 0;
        
        // Calculate average values
        let nonZeroMonthsA = 0, nonZeroMonthsB = 0;
        let totalBillA = 0, totalBillB = 0;
    
        for (const month in a.lytd || {}) {
            const bill = parseFloat(a.lytd[month]?.bill_paid || 0);
            if (bill > 0) {
                totalBillA += bill;
                nonZeroMonthsA++;
            }
        }
        for (const month in b.lytd || {}) {
            const bill = parseFloat(b.lytd[month]?.bill_paid || 0);
            if (bill > 0) {
                totalBillB += bill;
                nonZeroMonthsB++;
            }
        }
    
        avgA = nonZeroMonthsA > 0 ? totalBillA / nonZeroMonthsA : 0;
        avgB = nonZeroMonthsB > 0 ? totalBillB / nonZeroMonthsB : 0;
    
        // Sorting Logic
        if (lmtdA !== lmtdB) return lmtdB - lmtdA; // Sort by LMTD first
        if (mtdA !== mtdB) return mtdB - mtdA; // Then sort by MTD
        return avgB - avgA; // Finally, sort by average if both LMTD and MTD are zero
    });
    

    // Initialize total variables
    let subtotalMtdBill = 0;
    let subtotalMtdCount = 0;
    let subtotalLmtdBill = 0;
    let subtotalLmtdCount = 0;
    const subtotalMonths = initializeMonths();
    let lastTotalBillAvg = 0;
    let lastTotalCountAvg = 0;

    groupClients.forEach(client => {
        const months = initializeMonths();

        const mtdBill = (client.mtd?.bill_paid || 0) / 100000; // Convert to lakhs
        const mtdCount = client.mtd?.bill_paid_count || 0;
       
        for (const [monthYear, lytdData] of Object.entries(client.lytd || {})) {
            const month = monthYear.slice(0, 3);
            if (months[month]) {
                months[month].bill += parseFloat(lytdData.bill_paid || 0) / 100000; // Convert to lakhs
                months[month].count += parseInt(lytdData.bill_paid_count || 0);
            }
        }

        // Calculate total bills and counts for all months (avg)
        let subavgBill = 0;
        let subavgCount = 0;
        let subnonZeroMonthsavg = 0;

        for (const month in months) {
            if (months[month].bill > 0 || months[month].count > 0) {
                subavgBill += months[month].bill;
                subavgCount += months[month].count;
                subnonZeroMonthsavg++; // Count months that have non-zero values
            }
        }

        // Calculate the average amount and count, excluding zero values
        const avgAmount = subnonZeroMonthsavg > 0 ? (subavgBill / subnonZeroMonthsavg) : 0;
        const avgAmountFormatted = avgAmount;

        const avgCount = subnonZeroMonthsavg > 0 ? (subavgCount / subnonZeroMonthsavg) : 0;
        const avgCountFormatted = Math.round(avgCount); // Format count as comma-separated integer

        // Accumulate the last total averages for all groups
        lastTotalBillAvg += parseFloat(avgAmountFormatted) || 0;
        lastTotalCountAvg += parseInt(avgCountFormatted) || 0

        // ------Add to global totals
        subtotalMtdBill += mtdBill;
        subtotalMtdCount += parseInt(client.mtd?.bill_paid_count || 0, 10);
    
        subtotalLmtdBill += (client.lmtd?.bill_paid || 0) / 100000; // Convert to lakhs
        subtotalLmtdCount += parseInt(client.lmtd?.bill_paid_count || 0, 10);

        for (const month in months) {
            subtotalMonths[month].bill += months[month].bill;
            subtotalMonths[month].count += months[month].count;
        }

        // Replace 0 with '--' in all relevant fields for filterType=== 2
        function subformatValue(subvalue) {
            // Convert to number if possible to ensure proper comparisons
            const numericValue = parseFloat(subvalue) || 0;
    
            if (currentFilterType === '2') {
                return numericValue === 0 ? '--' : subvalue;
            } else if (currentFilterType === '3') {
                return numericValue === 0 ? '0' : '--';
            }
            return subvalue; // For currentFilterType === '1'
        }
        
        // -----------------------
        const row = document.createElement('tr');

        row.innerHTML = `

        <td>${client.lmtd?.disp_name || client.mtd?.disp_name || Object.values(client.lytd)[0].disp_name || "N/A" }</td>

         <td class="${(mtdBill >= (client.lmtd?.bill_paid || 0) / 100000) ? 'text-success' : 'text-danger'}">
        ${currentDisplayType === '1' ? subformatValue((mtdBill !== "" ? formatIndianNumber(mtdBill) : "") ) : " "}
    <span class="${parseFloat(client.mtd?.bill_paid_count) >= parseFloat(client.lmtd?.bill_paid_count) ? 'text-success' : 'text-danger'}">
    ${currentDisplayType === '2' ? subformatValue((mtdCount !== "" ? mtdCount.toLocaleString() : "")) : " "} </span>
    ${currentDisplayType === '3' ? `${subformatValue(mtdBill !== "" ? formatIndianNumber(mtdBill) : "") }  <br>
        <span class="count-font">(${subformatValue(mtdCount !== "" ? mtdCount.toLocaleString() : "")})</span>` : ""
            }
         </td>

        <td>
         ${currentDisplayType === '1'? subformatValue(formatIndianNumber(((client.lmtd?.bill_paid || 0)) / 100000 )) :
            currentDisplayType === '2'? subformatValue(formatNumber(client.lmtd?.bill_paid_count || 0)) :
            currentDisplayType === '3'? `${subformatValue(formatIndianNumber(((client.lmtd?.bill_paid || 0) / 100000)))}<br><span class="count-font">(${subformatValue((client.lmtd?.bill_paid_count.toLocaleString() || 0))})</span>`: ""
            }
         </td>

    ${suborderedMonths.map(month => `
        <td class="${(months[month].bill.toFixed(2) >= avgAmountFormatted) ? 'text-success' : 'text-danger'}">
            ${currentDisplayType === '1' ? subformatValue(formatIndianNumber(months[month].bill)) :  ""}
            <span class="${parseFloat(months[month].count) >= parseFloat(avgCountFormatted) ? 'text-success' : 'text-danger'}">${currentDisplayType === '2' ? subformatValue(formatNumber(months[month].count)) : ""} </span>
            ${currentDisplayType === '3' ? `
                ${subformatValue(formatIndianNumber(months[month].bill))}<br><span class="count-font">(${subformatValue(formatNumber(months[month].count))})</span>
            ` : ""}
        </td>
    `).join('')}
            
    <td>
        ${currentDisplayType === '1' ? (currentFilterType === '3' ? '0': formatIndianNumber(avgAmountFormatted)) :
          currentDisplayType === '2'  ? (currentFilterType === '3' ? '0' :(avgCountFormatted.toLocaleString())) :
          currentDisplayType === '3' ? `${currentFilterType ==='3' ? '0' : formatIndianNumber(avgAmountFormatted)}<br><span class="count-font">(${currentFilterType ==='3' ? '0': (avgCountFormatted.toLocaleString())})</span>` : ""
         }
    </td> 
        `; 
        tableBody.appendChild(row);
    });
   
    // Add totals to the subtotalRow
    subtotalRow.innerHTML += `
        <td class="${subtotalMtdBill >= subtotalLmtdBill ? 'text-success' : 'text-danger'}">
            ${currentDisplayType === '1'? currentFilterType === '3' ? '0': formatIndianNumber(subtotalMtdBill) :
        currentDisplayType === '2' ? currentFilterType === '3' ? '0' : `<span class="${subtotalMtdCount >= subtotalLmtdCount ? 'text-success' : 'text-danger'}">${formatNumber(subtotalMtdCount)}</span>` :
        currentDisplayType === '3' ? `${currentFilterType === '3' ? '0' : formatIndianNumber(subtotalMtdBill)} <br>
            <span class="count-font">(${currentFilterType === '3' ? '0' : formatNumber(subtotalMtdCount)}) </span>`: ""
            }
            </td>

        <td>
        ${currentDisplayType === '1' ? currentFilterType === '3' ? '0' :formatIndianNumber(subtotalLmtdBill !== "" ? (subtotalLmtdBill) : "") :
                currentDisplayType === '2' ? currentFilterType === '3' ? '0': formatNumber((subtotalLmtdCount !== "" ? subtotalLmtdCount.toLocaleString() : "")) :
                currentDisplayType === '3' ? `${currentFilterType === '3' ? '0' :subtotalLmtdBill !== "" ? formatIndianNumber(subtotalLmtdBill) : ""}  <br>
        <span class="count-font">(${formatNumber(currentFilterType === '3' ? '0' :subtotalLmtdCount !== "" ? subtotalLmtdCount.toLocaleString() : "")})</span>` : ""
            }
       </td>
  
         ${suborderedMonths
        .map((month) => {
            const monthData = subtotalMonths[month] || { bill: 0, count: 0 };
            const totalBill = parseFloat(monthData.bill).toFixed(2);
            const totalCount = formatNumber(monthData.count);
            const parsedCount = parseFloat(totalCount.replace(/,/g, ''));

            return `
                <td class="${(totalBill >= lastTotalBillAvg) ? 'text-success' : 'text-danger'}">
                    ${currentDisplayType === '1' ? currentFilterType === '3' ? '0' : formatIndianNumber(totalBill) :
                    currentDisplayType === '2' ? currentFilterType === '3' ? '0' :
                        `<span class="${(parsedCount >= lastTotalCountAvg) ? 'text-success' : 'text-danger'}">${formatNumber(totalCount)}</span>` :
                        currentDisplayType === '3' ? `${currentFilterType === '3' ? '0' : formatIndianNumber(totalBill)} <br>
                        <span class="count-font">(${currentFilterType === '3' ? '0' : formatNumber(totalCount)})</span>` : ""}
                </td>`;
        })
        .join("")}
        
         
          <td>
                ${currentDisplayType === '1' ? (currentFilterType === '3' ? '0.00' : formatIndianNumber(lastTotalBillAvg)) : ""}
                ${currentDisplayType === '2' ? (currentFilterType === '3' ? '0' : `${lastTotalCountAvg.toLocaleString()}`) : ""}
                ${currentDisplayType === '3' ? `
                    ${currentFilterType === '3' ? '0.00' : formatIndianNumber(lastTotalBillAvg)}
                    <br>
                    <span class="count-font">
                        (${currentFilterType === '3' ? '0.00' : lastTotalCountAvg.toLocaleString()})
                    </span>
                ` : ""}
            </td>

 `;
    const clientModal = new bootstrap.Modal(document.getElementById('clientModal'));
    clientModal.show();
}

// Format numbers with commas (e.g., 1,000 -> "1,000")
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Initialize on page load
fetchData();

