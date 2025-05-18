// src/student-sites/js/student-app.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof THIS_CLASS_ID === 'undefined') {
        console.error("THIS_CLASS_ID is not defined. Student app cannot initialize.");
        const display = document.getElementById('assignment-display');
        if (display) display.innerHTML = '<p class="text-danger">Configuration error: Class ID missing.</p>';
        return;
    }
    if (typeof db === 'undefined') {
        console.error("Firebase Firestore (db) is not initialized. Student app cannot initialize.");
        const display = document.getElementById('assignment-display');
        if (display) display.innerHTML = '<p class="text-danger">Configuration error: Database not available.</p>';
        return;
    }

    const assignmentsNavList = document.getElementById('assignments-nav-list');
    const assignmentDisplay = document.getElementById('assignment-display');
    let allAssignmentsData = {}; // Cache for all loaded assignments

    async function loadAssignmentsForClass() {
        assignmentsNavList.innerHTML = '<li class="loading-placeholder">Loading assignments...</li>';
        try {
            const querySnapshot = await db.collection('assignments')
                                          .where('classId', '==', THIS_CLASS_ID)
                                          .orderBy('createdAt', 'desc') // Initial sort by creation
                                          .get();
            
            assignmentsNavList.innerHTML = '';
            allAssignmentsData = {};

            if (querySnapshot.empty) {
                assignmentsNavList.innerHTML = '<li class="no-assignments-item">No assignments.</li>';
                assignmentDisplay.innerHTML = '<p class="no-assignment-placeholder">No assignments for this class.</p>';
                return;
            }

            const now = new Date();
            let processedAssignments = [];

            querySnapshot.forEach(doc => {
                const assignment = doc.data();
                allAssignmentsData[doc.id] = assignment; // Cache original data

                let effectiveDeadlineForSort = null;
                let displayTitle = '';
                let isPastEffective = false;

                if (assignment.isMultiProject && assignment.projects && assignment.projects.length > 0) {
                    displayTitle = assignment.assignmentGlobalTitle || "Multi-Project Assignment";
                    let farthestDeadline = null;
                    assignment.projects.forEach(p => {
                        if (p.projectDeadline && p.projectDeadline.toDate) {
                            const pDate = p.projectDeadline.toDate();
                            if (!farthestDeadline || pDate > farthestDeadline) {
                                farthestDeadline = pDate;
                            }
                        }
                    });
                    effectiveDeadlineForSort = farthestDeadline;
                } else { // Single project
                    displayTitle = assignment.title || "Assignment";
                    if (assignment.deadline && assignment.deadline.toDate) {
                        effectiveDeadlineForSort = assignment.deadline.toDate();
                    }
                }
                
                if (effectiveDeadlineForSort && effectiveDeadlineForSort < now) {
                    isPastEffective = true;
                }

                processedAssignments.push({ 
                    id: doc.id, 
                    ...assignment, // Spread original data too
                    effectiveDeadlineForSort: effectiveDeadlineForSort, // JS Date or null
                    displayTitle: displayTitle,
                    isPastEffective: isPastEffective
                });
            });

            // Separate into current/upcoming and past based on effectiveDeadlineForSort
            let currentAndUpcomingItems = processedAssignments.filter(item => !item.isPastEffective);
            let pastItems = processedAssignments.filter(item => item.isPastEffective);
            
            // Sort current/upcoming: by effectiveDeadlineForSort ascending (nulls last)
            currentAndUpcomingItems.sort((a, b) => {
                const aDeadline = a.effectiveDeadlineForSort;
                const bDeadline = b.effectiveDeadlineForSort;
                if (aDeadline && bDeadline) return aDeadline - bDeadline;
                if (aDeadline) return -1; // Items with deadlines come first
                if (bDeadline) return 1;
                return a.displayTitle.localeCompare(b.displayTitle); // Fallback sort by title
            });

            // Sort past items: by effectiveDeadlineForSort descending (most recent past first)
            pastItems.sort((a, b) => {
                const aDeadline = a.effectiveDeadlineForSort || new Date(0); // Treat null as very old
                const bDeadline = b.effectiveDeadlineForSort || new Date(0);
                return bDeadline - aDeadline;
            });
            
            const createAssignmentListItem = (itemData) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#${itemData.id}`;
                
                let iconHtml = '<i class="fas fa-file-alt link-icon"></i> ';
                const titleLower = itemData.displayTitle.toLowerCase();

                if (itemData.isMultiProject) {
                    iconHtml = '<i class="fas fa-layer-group link-icon"></i> ';
                } else if (titleLower.includes("exam") || titleLower.includes("test") || titleLower.includes("quiz")) {
                    iconHtml = '<i class="fas fa-pencil-ruler link-icon"></i> ';
                } else if (titleLower.includes("project") && !itemData.isMultiProject) {
                    iconHtml = '<i class="fas fa-lightbulb link-icon"></i> ';
                } else if (titleLower.includes("assignment")) {
                    iconHtml = '<i class="fas fa-tasks link-icon"></i> ';
                } else if (itemData.effectiveDeadlineForSort) {
                    iconHtml = '<i class="fas fa-calendar-check link-icon"></i> ';
                }
                
                a.innerHTML = `${iconHtml}${itemData.displayTitle}`;
                a.dataset.assignmentId = itemData.id;
                
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    displayAssignmentContent(itemData.id);
                    document.querySelectorAll('#assignments-nav-list a').forEach(link => link.classList.remove('active'));
                    a.classList.add('active');
                    window.location.hash = itemData.id; // Update hash for direct linking
                });
                li.appendChild(a);
                return li;
            };

            if (currentAndUpcomingItems.length > 0) {
                const upcomingHeaderLi = document.createElement('li');
                upcomingHeaderLi.className = 'sidebar-section-header';
                upcomingHeaderLi.innerHTML = '<i class="fas fa-hourglass-half"></i> Current & Upcoming';
                assignmentsNavList.appendChild(upcomingHeaderLi);
                currentAndUpcomingItems.forEach(item => assignmentsNavList.appendChild(createAssignmentListItem(item)));
            }

            if (pastItems.length > 0) {
                const pastHeaderLi = document.createElement('li');
                pastHeaderLi.className = 'sidebar-section-header';
                pastHeaderLi.innerHTML = '<i class="fas fa-history"></i> Past Items';
                assignmentsNavList.appendChild(pastHeaderLi);
                pastItems.forEach(item => {
                    const listItem = createAssignmentListItem(item);
                    listItem.classList.add('past-item-link'); // For potential distinct styling of past items
                    assignmentsNavList.appendChild(listItem);
                });
            }
            
            if (assignmentsNavList.children.length === 0) { // Should not happen if querySnapshot wasn't empty, but defensive
                 assignmentsNavList.innerHTML = '<li class="no-assignments-item">No assignments found.</li>';
            }

            // Handle initial view based on hash or first item
            if (window.location.hash) {
                const assignmentIdFromHash = window.location.hash.substring(1);
                if (allAssignmentsData[assignmentIdFromHash]) {
                    displayAssignmentContent(assignmentIdFromHash);
                    const activeLink = assignmentsNavList.querySelector(`a[data-assignment-id="${assignmentIdFromHash}"]`);
                    if (activeLink) activeLink.classList.add('active');
                } else {
                     assignmentDisplay.innerHTML = '<p class="no-assignment-placeholder">Select an assignment, or the requested one was not found.</p>';
                }
            } else if (currentAndUpcomingItems.length > 0) {
                // Optionally, auto-select the first current/upcoming assignment
                // displayAssignmentContent(currentAndUpcomingItems[0].id);
                // const firstLink = assignmentsNavList.querySelector(`a[data-assignment-id="${currentAndUpcomingItems[0].id}"]`);
                // if(firstLink) firstLink.classList.add('active');
                assignmentDisplay.innerHTML = '<p class="no-assignment-placeholder">Select an assignment from the sidebar.</p>';
            } else if (pastItems.length > 0) {
                 assignmentDisplay.innerHTML = '<p class="no-assignment-placeholder">Select an assignment from the sidebar (only past items available).</p>';
            } else { // No items at all
                 assignmentDisplay.innerHTML = '<p class="no-assignment-placeholder">Select an assignment from the sidebar.</p>';
            }
        } catch (error) {
            console.error("Error loading assignments: ", error);
            assignmentsNavList.innerHTML = '<li>Error loading assignments.</li>';
            assignmentDisplay.innerHTML = '<p class="text-danger">Could not load assignments. Please try refreshing the page.</p>';
        }
    }
    
    function formatStudentDeadline(deadlineTimestamp) {
        if (!deadlineTimestamp || !deadlineTimestamp.toDate) {
            return null;
        }
        const deadlineDate = deadlineTimestamp.toDate();
        const now = new Date();
        const isPastDue = deadlineDate < now;

        const options = {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        };
        const formattedDate = deadlineDate.toLocaleDateString('en-US', options);

        return {
            text: formattedDate,
            isPastDue: isPastDue,
            dateObj: deadlineDate
        };
    }

    function generateEmbed(url, description = '') {
        description = description || 'Embedded Content'; // Fallback description
        // Simple YouTube embed
        if (url.includes("youtube.com/watch?v=")) {
            const videoId = url.split('v=')[1].split('&')[0];
            return `<div class="video-container"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen title="${description}"></iframe></div>`;
        }
        // Simple Google Drive PDF embed (ensure link is shareable and allows embedding)
        if (url.includes("drive.google.com") && url.includes("/view")) {
             // Needs to be transformed from /view to /preview
            const embedUrl = url.replace("/view", "/preview");
            return `<iframe src="${embedUrl}" width="100%" height="500px" allow="autoplay" title="${description}"></iframe>`;
        }
        // Image embed
        if (/\.(jpeg|jpg|gif|png|svg)$/i.test(url)) {
            return `<img src="${url}" alt="${description}" class="embedded-image" style="max-width:100%; height:auto;">`;
        }
        // Default: a link
        let iconClass = "fas fa-link";
        if (url.includes("docs.google.com/document")) iconClass = "fas fa-file-word";
        else if (url.includes("docs.google.com/spreadsheets")) iconClass = "fas fa-file-excel";
        else if (url.includes("docs.google.com/presentation")) iconClass = "fas fa-file-powerpoint";
        else if (url.includes("pdf")) iconClass = "fas fa-file-pdf";

        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="resource-link">
                    <i class="${iconClass}"></i> ${description || 'Open Link'}
                </a>`;
    }

    function displayAssignmentContent(assignmentId) {
        const assignment = allAssignmentsData[assignmentId];
        if (!assignment) {
            assignmentDisplay.innerHTML = '<p class="text-danger">Assignment data not found. Please try selecting again.</p>';
            return;
        }

        let contentHtml = '';

        if (assignment.isMultiProject) {
            contentHtml = `<h1>${assignment.assignmentGlobalTitle || 'Multi-Project Assignment'}</h1>`;
            
            if (assignment.projects && assignment.projects.length > 0) {
                const projectTabsId = `project-tabs-${assignmentId}`; // Unique ID for the tab container
                let tabLinksHtml = `<ul class="nav nav-pills student-project-tabs mb-3" id="${projectTabsId}" role="tablist">`;
                let tabPanesHtml = '<div class="tab-content student-project-panes">';

                assignment.projects.forEach((proj, index) => {
                    const projIdSafe = `proj-${assignmentId}-${index}`; // Unique ID for tab and pane
                    const isActive = index === 0; // Make the first tab active

                    tabLinksHtml += `
                        <li class="nav-item" role="presentation">
                            <button class="nav-link ${isActive ? 'active' : ''}" id="tab-${projIdSafe}" data-bs-toggle="tab" data-bs-target="#pane-${projIdSafe}" type="button" role="tab" aria-controls="pane-${projIdSafe}" aria-selected="${isActive ? 'true' : 'false'}">
                                ${proj.projectTitle || `Project ${index + 1}`}
                            </button>
                        </li>`;
                    
                    let projLinksHtml = '<p><i class="fas fa-info-circle"></i> No links for this project.</p>';
                    if (proj.projectLinks && proj.projectLinks.length > 0) {
                        projLinksHtml = `
                            <div class="links-section">
                                <h3><i class="fas fa-paperclip"></i> Attached Resources:</h3>
                                ${proj.projectLinks.map(link => `
                                    <div class="link-item">
                                        ${link.description ? `<p class="link-description-text">${link.description}</p>` : ''}
                                        ${generateEmbed(link.url, link.description)}
                                    </div>`).join('')}
                            </div>`;
                    }

                    const projDeadlineInfo = formatStudentDeadline(proj.projectDeadline);
                    let projDeadlineHtml = `<div class="deadline-info not-set"><p><i class="fas fa-calendar-times"></i> <strong>Deadline:</strong> Not set</p></div>`;
                    if (projDeadlineInfo) {
                        const timeDiff = projDeadlineInfo.dateObj.getTime() - new Date().getTime();
                        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        let countdownText = '';
                        if (!projDeadlineInfo.isPastDue) {
                            if (daysRemaining === 0) countdownText = ' (Due today!)';
                            else if (daysRemaining === 1) countdownText = ' (Due tomorrow!)';
                            else if (daysRemaining > 1) countdownText = ` (Due in ${daysRemaining} days)`;
                        }
                        projDeadlineHtml = `
                            <div class="deadline-info ${projDeadlineInfo.isPastDue ? 'past-due' : 'upcoming'}">
                                <p><i class="fas ${projDeadlineInfo.isPastDue ? 'fa-exclamation-triangle' : 'fa-calendar-alt'}"></i>
                                    <strong>Deadline:</strong> ${projDeadlineInfo.text}
                                    ${projDeadlineInfo.isPastDue ? ' <span class="badge-due">(Past Due)</span>' : `<span class="countdown-badge">${countdownText}</span>`}
                                </p>
                            </div>`;
                    }

                    tabPanesHtml += `
                        <div class="tab-pane fade ${isActive ? 'show active' : ''}" id="pane-${projIdSafe}" role="tabpanel" aria-labelledby="tab-${projIdSafe}">
                            ${proj.projectSubtitle ? `<h2 class="subtitle">${proj.projectSubtitle}</h2>` : ''}
                            ${projDeadlineHtml}
                            <div class="description">
                                <h3><i class="fas fa-align-left"></i> Description:</h3>
                                ${proj.projectDescription ? proj.projectDescription.replace(/\n/g, '<br>') : '<p>No description provided for this project.</p>'}
                            </div>
                            ${projLinksHtml}
                        </div>`;
                });
                tabLinksHtml += '</ul>';
                tabPanesHtml += '</div>';
                contentHtml += tabLinksHtml + tabPanesHtml;

            } else {
                contentHtml += '<p>This multi-project assignment currently has no defined sub-projects.</p>';
            }

        } else { // Single project (original logic)
            const deadlineInfo = formatStudentDeadline(assignment.deadline);
            let deadlineHtml = `<div class="deadline-info not-set"><p><i class="fas fa-calendar-times"></i> <strong>Deadline:</strong> Not set</p></div>`;
            if (deadlineInfo) {
                const timeDiff = deadlineInfo.dateObj.getTime() - new Date().getTime();
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                let countdownText = '';
                if (!deadlineInfo.isPastDue) {
                     if (daysRemaining === 0) countdownText = ' (Due today!)';
                     else if (daysRemaining === 1) countdownText = ' (Due tomorrow!)';
                     else if (daysRemaining > 1) countdownText = ` (Due in ${daysRemaining} days)`;
                }
                deadlineHtml = `
                    <div class="deadline-info ${deadlineInfo.isPastDue ? 'past-due' : 'upcoming'}">
                        <p><i class="fas ${deadlineInfo.isPastDue ? 'fa-exclamation-triangle' : 'fa-calendar-alt'}"></i>
                            <strong>Deadline:</strong> ${deadlineInfo.text}
                            ${deadlineInfo.isPastDue ? ' <span class="badge-due">(Past Due)</span>' : `<span class="countdown-badge">${countdownText}</span>`}
                        </p>
                    </div>`;
            }

            let linksHtml = '<p><i class="fas fa-info-circle"></i> No links attached.</p>';
            if (assignment.links && assignment.links.length > 0) {
                 linksHtml = `
                    <div class="links-section">
                        <h3><i class="fas fa-paperclip"></i> Attached Resources:</h3>
                        ${assignment.links.map(link => `<div class="link-item">${link.description ? `<p class="link-description-text">${link.description}</p>` : ''}${generateEmbed(link.url, link.description)}</div>`).join('')}
                    </div>`;
            }

            contentHtml = `
                <h1>${assignment.title}</h1>
                ${assignment.subtitle ? `<h2 class="subtitle">${assignment.subtitle}</h2>` : ''}
                ${deadlineHtml}
                <div class="description">
                    <h3><i class="fas fa-align-left"></i> Description:</h3>
                    ${assignment.description ? assignment.description.replace(/\n/g, '<br>') : '<p>No description provided.</p>'}
                </div>
                ${linksHtml}
            `;
        }
        assignmentDisplay.innerHTML = contentHtml;

        // Re-initialize Bootstrap tabs if they were added for multi-project
        // This is important because the tab HTML is dynamically injected.
        if (assignment.isMultiProject && assignment.projects && assignment.projects.length > 0) {
            const projectTabsElement = document.getElementById(`project-tabs-${assignmentId}`);
            if (projectTabsElement) {
                 const triggerTabList = [].slice.call(projectTabsElement.querySelectorAll('button[data-bs-toggle="tab"]'));
                 triggerTabList.forEach(function (triggerEl) {
                   // eslint-disable-next-line no-new
                   new bootstrap.Tab(triggerEl); // Initialize each tab
                 });
                // console.log(`Bootstrap tabs re-initialized for multi-project assignment: ${assignmentId}`);
            }
        }
    }

    // Initial load
    loadAssignmentsForClass();

    // Hash change listener - for direct navigation to an assignment via URL hash
    window.addEventListener('hashchange', () => {
        const assignmentIdFromHash = window.location.hash.substring(1);
        if (allAssignmentsData[assignmentIdFromHash]) {
            displayAssignmentContent(assignmentIdFromHash);
            // Update active link in sidebar
            document.querySelectorAll('#assignments-nav-list a').forEach(link => link.classList.remove('active'));
            const activeLink = assignmentsNavList.querySelector(`a[data-assignment-id="${assignmentIdFromHash}"]`);
            if (activeLink) activeLink.classList.add('active');
        } else if (!assignmentIdFromHash) { // Hash is empty (e.g., user cleared it)
             assignmentDisplay.innerHTML = '<p class="no-assignment-placeholder">Select an assignment from the sidebar.</p>';
             document.querySelectorAll('#assignments-nav-list a').forEach(link => link.classList.remove('active'));
        }
        // If hash points to a non-existent assignment, the placeholder from loadAssignments or displayAssignmentContent will handle it.
    });
});