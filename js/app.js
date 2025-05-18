// src/teacher/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('[APP.JS] DOMContentLoaded - Script starting.');

    // Ensure auth.js has run and auth object is available
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error("[APP.JS] CRITICAL ERROR: Firebase SDKs (auth or db) not loaded correctly.");
        document.body.innerHTML = '<div class="alert alert-danger m-5" role="alert">Critical Error: Firebase SDKs not loaded. Please contact support.</div>';
        return;
    }
    console.log('[APP.JS] Firebase SDKs (auth, db) seem to be available.');

    const sidebarNav = document.querySelector('#sidebar .nav');
    const currentClassTitleEl = document.getElementById('current-class-title');
    const assignmentsList = document.getElementById('assignments-list');

    // Button to show form options
    const addAssignmentOptions = document.getElementById('add-assignment-options');
    const showSingleProjectFormBtn = document.getElementById('show-single-project-form-btn');
    const showMultiProjectFormBtn = document.getElementById('show-multiproject-form-btn');

    // Single-Project Form Elements
    const singleProjectFormContainer = document.getElementById('single-project-form-container');
    const singleProjectForm = document.getElementById('single-project-form');
    const singleProjectFormTitleTextEl = document.getElementById('single-project-form-title');
    const singleProjectAssignmentIdInput = document.getElementById('assignment-id');
    const singleProjectTitleInput = document.getElementById('assignment-title');
    const singleProjectSubtitleInput = document.getElementById('assignment-subtitle');
    const singleProjectDescriptionInput = document.getElementById('assignment-description');
    const singleProjectDeadlineInput = document.getElementById('assignment-deadline');
    const singleProjectLinksContainer = document.getElementById('links-container');
    const singleProjectAddLinkBtn = document.getElementById('add-link-btn');
    const cancelSingleProjectFormBtn = document.getElementById('cancel-form-btn');

    // Multi-Project Form Elements
    const multiprojectFormContainer = document.getElementById('multiproject-form-container');
    const multiprojectForm = document.getElementById('multiproject-form');
    const multiprojectFormTitleTextEl = document.getElementById('multiproject-form-title-text');
    const multiprojectAssignmentIdInput = document.getElementById('multiproject-assignment-id');
    const multiprojectGlobalTitleInput = document.getElementById('multiproject-global-title');
    const projectTabsList = document.getElementById('project-tabs-list');
    const projectTabsContent = document.getElementById('project-tabs-content');
    const addProjectTabBtn = document.getElementById('add-project-tab-btn');
    const cancelMultiprojectFormBtn = document.getElementById('cancel-multiproject-form-btn');

    console.debug('[APP.JS] DOM Elements selected:', {
        sidebarNav, currentClassTitleEl, assignmentsList, addAssignmentOptions,
        showSingleProjectFormBtn, showMultiProjectFormBtn, singleProjectFormContainer,
        multiprojectFormContainer, projectTabsList, projectTabsContent, addProjectTabBtn
    });

    const classes = ["X-1", "X-2", "X-3", "XI-1", "XI-2", "XI-3", "XII"];
    let currentSelectedClass = null;
    let editingAssignmentId = null;
    let editingAssignmentType = null;
    let projectClientTabCounter = 0;

    // Populate sidebar
    classes.forEach(className => {
        const li = document.createElement('li');
        li.classList.add('nav-item');
        const a = document.createElement('a');
        a.classList.add('nav-link');
        a.href = '#';
        a.innerHTML = `<i class="fas fa-chalkboard"></i> ${className}`;
        a.dataset.class = className;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(`[APP.JS] Sidebar link clicked for class: ${className}`);
            selectClass(className);
            document.querySelectorAll('#sidebar .nav-link').forEach(link => link.classList.remove('active'));
            a.classList.add('active');
        });
        li.appendChild(a);
        sidebarNav.appendChild(li);
    });
    console.log('[APP.JS] Sidebar populated with classes.');

    function selectClass(className) {
        console.log(`[APP.JS] selectClass called for: ${className}`);
        currentSelectedClass = className;
        currentClassTitleEl.textContent = `Assignments for ${className}`;
        if (addAssignmentOptions) addAssignmentOptions.style.display = 'block';
        if (singleProjectFormContainer) singleProjectFormContainer.style.display = 'none';
        if (multiprojectFormContainer) multiprojectFormContainer.style.display = 'none';
        loadAssignments(className);
    }

    function formatToDateTimeLocal(date) {
        if (!date || !(date instanceof Date)) return '';
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    function addLinkFieldToSpecificContainer(container, url = '', description = '', focus = false) {
        console.debug(`[APP.JS] addLinkFieldToSpecificContainer called for container:`, container);
        const linkEntryDiv = document.createElement('div');
        linkEntryDiv.classList.add('link-entry', 'mb-2', 'input-group', 'input-group-sm');
        linkEntryDiv.innerHTML = `
            <input type="url" class="form-control link-url" placeholder="Link URL (e.g., https://...)" value="${url}">
            <input type="text" class="form-control link-description" placeholder="Link Description (optional)" value="${description}">
            <button type="button" class="btn btn-outline-danger remove-link-btn" title="Remove Link"><i class="fas fa-minus-circle"></i></button>
        `;
        linkEntryDiv.querySelector('.remove-link-btn').addEventListener('click', () => {
            console.log('[APP.JS] Remove link button clicked.');
            linkEntryDiv.remove();
        });
        container.appendChild(linkEntryDiv);
        if (focus) {
            console.debug('[APP.JS] Focusing new link URL field.');
            linkEntryDiv.querySelector('.link-url').focus();
        }
    }
    
    if (singleProjectAddLinkBtn) {
        singleProjectAddLinkBtn.addEventListener('click', () => {
            console.log('[APP.JS] singleProjectAddLinkBtn clicked.');
            addLinkFieldToSpecificContainer(singleProjectLinksContainer, '', '', true);
        });
    } else {
        console.warn('[APP.JS] singleProjectAddLinkBtn not found in DOM.');
    }

    // --- Show/Hide Forms ---
    if (showSingleProjectFormBtn) {
        showSingleProjectFormBtn.addEventListener('click', () => {
            console.log('[APP.JS] showSingleProjectFormBtn clicked.');
            editingAssignmentId = null;
            editingAssignmentType = 'single';
            singleProjectFormTitleTextEl.innerHTML = '<i class="fas fa-file-alt text-primary"></i> Add New Single-Project Assignment';
            singleProjectForm.reset();
            singleProjectLinksContainer.innerHTML = '';
            singleProjectDeadlineInput.value = '';
            addLinkFieldToSpecificContainer(singleProjectLinksContainer);
            singleProjectFormContainer.style.display = 'block';
            multiprojectFormContainer.style.display = 'none';
            singleProjectAssignmentIdInput.value = '';
            singleProjectTitleInput.focus();
            window.scrollTo({ top: singleProjectFormContainer.offsetTop - 70, behavior: 'smooth' });
        });
    } else {
        console.warn('[APP.JS] showSingleProjectFormBtn not found.');
    }

    if (showMultiProjectFormBtn) {
        showMultiProjectFormBtn.addEventListener('click', () => {
            console.log('[APP.JS] showMultiProjectFormBtn clicked.');
            editingAssignmentId = null;
            editingAssignmentType = 'multi';
            multiprojectFormTitleTextEl.innerHTML = '<i class="fas fa-layer-group text-info"></i> Add New Multi-Project Assignment';
            multiprojectForm.reset();
            projectTabsList.innerHTML = '';
            projectTabsContent.innerHTML = '';
            projectClientTabCounter = 0;
            addNewProjectTab();
            multiprojectFormContainer.style.display = 'block';
            singleProjectFormContainer.style.display = 'none';
            multiprojectAssignmentIdInput.value = '';
            multiprojectGlobalTitleInput.focus();
            window.scrollTo({ top: multiprojectFormContainer.offsetTop - 70, behavior: 'smooth' });
        });
    } else {
        console.warn('[APP.JS] showMultiProjectFormBtn not found.');
    }

    if (cancelSingleProjectFormBtn) {
        cancelSingleProjectFormBtn.addEventListener('click', () => {
            console.log('[APP.JS] cancelSingleProjectFormBtn clicked.');
            singleProjectFormContainer.style.display = 'none';
            singleProjectForm.reset();
            singleProjectLinksContainer.innerHTML = '';
            editingAssignmentId = null;
        });
    } else {
        console.warn('[APP.JS] cancelSingleProjectFormBtn not found.');
    }

    if (cancelMultiprojectFormBtn) {
        cancelMultiprojectFormBtn.addEventListener('click', () => {
            console.log('[APP.JS] cancelMultiprojectFormBtn clicked.');
            multiprojectFormContainer.style.display = 'none';
            multiprojectForm.reset();
            projectTabsList.innerHTML = '';
            projectTabsContent.innerHTML = '';
            editingAssignmentId = null;
        });
    } else {
        console.warn('[APP.JS] cancelMultiprojectFormBtn not found.');
    }

    // --- Multi-Project: Add New Project Tab ---
    if (addProjectTabBtn) {
        addProjectTabBtn.addEventListener('click', () => {
            console.log('[APP.JS] addProjectTabBtn clicked.');
            addNewProjectTab();
        });
    } else {
        console.error('[APP.JS] CRITICAL: addProjectTabBtn (button to add new project) not found in DOM! This is likely the cause of the issue.');
    }

    function addNewProjectTab(projectData = null) {
        console.log(`[APP.JS] addNewProjectTab called. projectData:`, projectData);
        projectClientTabCounter++;
        console.debug(`[APP.JS] projectClientTabCounter incremented to: ${projectClientTabCounter}`);

        const uniqueId = projectData && projectData.projectId ? projectData.projectId : `client_${projectClientTabCounter}`;
        const isFirstTab = projectTabsList.children.length === 0;
        console.debug(`[APP.JS] uniqueId: ${uniqueId}, isFirstTab: ${isFirstTab}`);

        const tabLi = document.createElement('li');
        tabLi.classList.add('nav-item');
        tabLi.setAttribute('role', 'presentation');
        console.debug('[APP.JS] Created tabLi:', tabLi);

        const tabButton = document.createElement('button');
        tabButton.classList.add('nav-link', 'py-1', 'px-2', 'd-flex', 'align-items-center');
        if (isFirstTab) tabButton.classList.add('active');
        tabButton.id = `project-tab-${uniqueId}`;
        tabButton.setAttribute('data-bs-toggle', 'tab');
        tabButton.setAttribute('data-bs-target', `#project-pane-${uniqueId}`);
        tabButton.type = 'button';
        tabButton.role = 'tab';
        tabButton.setAttribute('aria-controls', `project-pane-${uniqueId}`);
        tabButton.setAttribute('aria-selected', isFirstTab ? 'true' : 'false');
        console.debug('[APP.JS] Created tabButton:', tabButton);

        const tabTitleSpan = document.createElement('span');
        tabTitleSpan.classList.add('project-tab-title', 'me-2');
        tabTitleSpan.contentEditable = true;
        tabTitleSpan.textContent = projectData ? projectData.projectTitle : `Project ${projectClientTabCounter}`;
        tabButton.appendChild(tabTitleSpan);
        console.debug('[APP.JS] Created tabTitleSpan:', tabTitleSpan);

        const removeTabBtn = document.createElement('button');
        removeTabBtn.type = 'button';
        removeTabBtn.classList.add('btn-close', 'btn-close-sm');
        removeTabBtn.setAttribute('aria-label', 'Remove Project');
        removeTabBtn.style.fontSize = '0.65rem';
        removeTabBtn.addEventListener('click', (e) => {
            console.log('[APP.JS] Remove project tab button clicked.');
            e.stopPropagation();
            if (projectTabsList.children.length <= 1) {
                alert("An assignment must have at least one project.");
                console.warn('[APP.JS] Attempted to remove the last project tab.');
                return;
            }
            if (confirm("Are you sure you want to remove this project?")) {
                console.log('[APP.JS] Confirmed removal of project tab.');
                const paneId = tabButton.getAttribute('data-bs-target');
                document.querySelector(paneId)?.remove();
                tabLi.remove();
                if (tabButton.classList.contains('active') && projectTabsList.children.length > 0) {
                    const firstTabLink = projectTabsList.querySelector('.nav-link');
                    if (firstTabLink) {
                        console.debug('[APP.JS] Activating first remaining tab.');
                        new bootstrap.Tab(firstTabLink).show();
                    }
                }
            }
        });
        tabButton.appendChild(removeTabBtn);
        tabLi.appendChild(tabButton);
        projectTabsList.appendChild(tabLi);
        console.debug('[APP.JS] Appended tabLi to projectTabsList. Current projectTabsList children:', projectTabsList.children.length);

        const tabPane = document.createElement('div');
        tabPane.classList.add('tab-pane', 'fade', 'p-3', 'border', 'border-top-0');
        if (isFirstTab) tabPane.classList.add('show', 'active');
        tabPane.id = `project-pane-${uniqueId}`;
        tabPane.setAttribute('role', 'tabpanel');
        tabPane.setAttribute('aria-labelledby', `project-tab-${uniqueId}`);
        tabPane.dataset.clientProjectId = uniqueId;
        console.debug('[APP.JS] Created tabPane:', tabPane);

        const deadlineValue = projectData && projectData.projectDeadline ? formatToDateTimeLocal(projectData.projectDeadline.toDate()) : '';
        tabPane.innerHTML = `
            <input type="hidden" class="project-real-id" value="${projectData ? projectData.projectId || '' : ''}">
            <div class="mb-2">
                <label class="form-label form-label-sm">Project Subtitle</label>
                <input type="text" class="form-control form-control-sm project-subtitle" value="${projectData ? projectData.projectSubtitle || '' : ''}">
            </div>
            <div class="mb-2">
                <label class="form-label form-label-sm">Project Description</label>
                <textarea class="form-control form-control-sm project-description" rows="2">${projectData ? projectData.projectDescription || '' : ''}</textarea>
            </div>
            <div class="mb-2">
                <label class="form-label form-label-sm">Project Deadline</label>
                <input type="datetime-local" class="form-control form-control-sm project-deadline" value="${deadlineValue}">
            </div>
            <h6 class="mt-2 mb-1 small">Project Links:</h6>
            <div class="project-links-container mb-2"></div>
            <button type="button" class="btn btn-secondary btn-sm add-project-specific-link-btn">
                <i class="fas fa-plus"></i> Add Link to This Project
            </button>
        `;
        projectTabsContent.appendChild(tabPane);
        console.debug('[APP.JS] Appended tabPane to projectTabsContent. Current projectTabsContent children:', projectTabsContent.children.length);

        const projectLinksDiv = tabPane.querySelector('.project-links-container');
        if (projectData && projectData.projectLinks) {
            console.debug('[APP.JS] Populating links for existing projectData.');
            projectData.projectLinks.forEach(link => addLinkFieldToSpecificContainer(projectLinksDiv, link.url, link.description));
        } else {
            console.debug('[APP.JS] Adding one empty link field for new project.');
            addLinkFieldToSpecificContainer(projectLinksDiv);
        }

        tabPane.querySelector('.add-project-specific-link-btn').addEventListener('click', () => {
            console.log('[APP.JS] Add project-specific link button clicked.');
            addLinkFieldToSpecificContainer(projectLinksDiv, '', '', true);
        });

        if (isFirstTab && projectData === null) {
            console.debug('[APP.JS] Focusing and selecting text for the first new project tab title.');
            tabTitleSpan.focus();
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(tabTitleSpan);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        console.log('[APP.JS] addNewProjectTab finished successfully.');
    }


    // --- Load Assignments ---
    async function loadAssignments(className) {
        console.log(`[APP.JS] loadAssignments called for class: ${className}`);
        assignmentsList.innerHTML = `<div class="loading-state"><div class="spinner-border text-primary"></div><p>Loading...</p></div>`;
        try {
            const querySnapshot = await db.collection('assignments')
                                          .where('classId', '==', className)
                                          .orderBy('createdAt', 'desc')
                                          .get();
            assignmentsList.innerHTML = '';
            if (querySnapshot.empty) {
                console.info(`[APP.JS] No assignments found for class: ${className}`);
                assignmentsList.innerHTML = `<div class="empty-state"><i class="far fa-folder-open fa-3x"></i><p>No assignments for ${className}.</p></div>`;
                return;
            }
            console.info(`[APP.JS] Found ${querySnapshot.docs.length} assignments for class: ${className}`);
            querySnapshot.forEach(doc => {
                const assignment = doc.data();
                const assignmentEl = createAssignmentElement(doc.id, assignment);
                assignmentsList.appendChild(assignmentEl);
            });
        } catch (error) {
            console.error("[APP.JS] Error loading assignments: ", error);
            assignmentsList.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    }
    
    function formatDashboardDeadline(deadlineTimestamp) {
        if (!deadlineTimestamp) return 'Not set';
        const date = deadlineTimestamp.toDate();
        return date.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    }

    function createAssignmentElement(id, assignment) {
        // console.debug(`[APP.JS] createAssignmentElement called for ID: ${id}, data:`, assignment);
        const div = document.createElement('div');
        div.classList.add('card', 'mb-3');
        div.dataset.assignmentId = id;
        let cardContentHtml = '';

        if (assignment.isMultiProject) {
            const projectListHtml = assignment.projects && assignment.projects.length > 0
                ? `<ul class="list-unstyled small mb-0 mt-1">
                    ${assignment.projects.map(p => `
                        <li>
                            <i class="fas fa-caret-right fa-xs text-muted"></i> <strong>${p.projectTitle || 'Untitled Project'}</strong>
                            ${p.projectDeadline ? `(Due: ${formatDashboardDeadline(p.projectDeadline)})` : ''}
                        </li>`).join('')}
                   </ul>`
                : '<p class="text-muted small mb-0">No projects defined.</p>';

            cardContentHtml = `
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <div>
                        <h5 class="card-title mb-0">${assignment.assignmentGlobalTitle || 'Untitled Multi-Project Assignment'}</h5>
                        <span class="badge bg-info text-dark small">Multi-Project</span>
                    </div>
                    <div class="card-actions btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary edit-btn" data-id="${id}" data-type="multi" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-outline-danger delete-btn" data-id="${id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="assignment-details-section">${projectListHtml}</div>`;
        } else {
            const deadlineText = assignment.deadline ? formatDashboardDeadline(assignment.deadline) : 'Not set';
            const deadlineClass = assignment.deadline ? '' : 'text-muted';
            let linksHtml = '<p class="text-muted small mb-0">No links.</p>';
            if (assignment.links && assignment.links.length > 0) {
                linksHtml = `<h6 class="small text-uppercase text-muted mt-2"><i class="fas fa-paperclip"></i> Links:</h6>
                             <ul class="list-unstyled small mb-0">
                                ${assignment.links.map(link => `<li><a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.description || link.url}</a></li>`).join('')}
                             </ul>`;
            }
            const descriptionHtml = assignment.description
                ? `<div class="assignment-details-section"><p class="card-text small mb-0">${assignment.description.replace(/\n/g, '<br>')}</p></div>`
                : '<div class="assignment-details-section"><p class="card-text text-muted small mb-0">No description.</p></div>';

            cardContentHtml = `
                <div class="d-flex justify-content-between align-items-start mb-1">
                     <div>
                        <h5 class="card-title mb-0">${assignment.title || 'Untitled Assignment'}</h5>
                        ${assignment.subtitle ? `<h6 class="card-subtitle mb-1 text-muted fw-normal small">${assignment.subtitle}</h6>` : ''}
                         <span class="badge bg-primary text-white small">Single-Project</span>
                    </div>
                    <div class="card-actions btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary edit-btn" data-id="${id}" data-type="single" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn btn-outline-danger delete-btn" data-id="${id}" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <hr class="my-1">
                ${descriptionHtml}
                <div class="assignment-details-section mt-1">
                    <p class="card-text ${deadlineClass} small mb-0">
                        <strong><i class="fas fa-calendar-alt text-secondary"></i> Deadline:</strong> ${deadlineText}
                    </p>
                </div>
                <div class="assignment-details-section mt-1">${linksHtml}</div>`;
        }
        div.innerHTML = `<div class="card-body py-2 px-3">${cardContentHtml}</div>`;
        div.querySelector('.edit-btn').addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.type;
            console.log(`[APP.JS] Edit button clicked for assignment ID: ${id}, type: ${type}`);
            loadAssignmentForEdit(id, type);
        });
        div.querySelector('.delete-btn').addEventListener('click', () => {
            console.log(`[APP.JS] Delete button clicked for assignment ID: ${id}`);
            deleteAssignment(id);
        });
        return div;
    }

    singleProjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[APP.JS] singleProjectForm submitted.');
        if (!currentSelectedClass) { alert("Select a class!"); return; }
        const title = singleProjectTitleInput.value.trim();
        if (!title) { alert("Title is mandatory!"); singleProjectTitleInput.focus(); return; }

        const subtitle = singleProjectSubtitleInput.value.trim();
        const description = singleProjectDescriptionInput.value.trim();
        const deadlineValue = singleProjectDeadlineInput.value;
        let deadlineTimestamp = deadlineValue ? firebase.firestore.Timestamp.fromDate(new Date(deadlineValue)) : null;

        const links = [];
        let linksValid = true;
        singleProjectLinksContainer.querySelectorAll('.link-entry').forEach(entry => {
            const urlInput = entry.querySelector('.link-url');
            const url = urlInput.value.trim();
            const desc = entry.querySelector('.link-description').value.trim();
            if (url) {
                try { new URL(url); links.push({ url, description: desc }); }
                catch (_) { linksValid = false; urlInput.classList.add('is-invalid'); }
            } else if (desc) { linksValid = false; urlInput.classList.add('is-invalid');}
            else {urlInput.classList.remove('is-invalid');}
        });
        if (!linksValid) { alert("Invalid/missing link URLs."); return; }

        const assignmentPayload = {
            classId: currentSelectedClass, title, subtitle: subtitle || null,
            description: description || null, links, deadline: deadlineTimestamp,
            isMultiProject: false,
        };
        console.debug('[APP.JS] Single-project payload:', assignmentPayload);

        const saveButton = singleProjectForm.querySelector('button[type="submit"]');
        const originalButtonHTML = saveButton.innerHTML;
        saveButton.innerHTML = `Saving... <span class="spinner-border spinner-border-sm"></span>`;
        saveButton.disabled = true;

        try {
            if (editingAssignmentId && editingAssignmentType === 'single') {
                assignmentPayload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('assignments').doc(editingAssignmentId).update(assignmentPayload);
                console.log(`[APP.JS] Updated single-project assignment ID: ${editingAssignmentId}`);
            } else {
                assignmentPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await db.collection('assignments').add(assignmentPayload);
                console.log(`[APP.JS] Added new single-project assignment ID: ${docRef.id}`);
            }
            singleProjectForm.reset();
            singleProjectLinksContainer.innerHTML = '';
            singleProjectFormContainer.style.display = 'none';
            editingAssignmentId = null;
            loadAssignments(currentSelectedClass);
            alert("Single-project assignment saved!");
        } catch (error) { console.error("[APP.JS] Error saving single-project assignment:", error); alert("Error: " + error.message); }
        finally { saveButton.innerHTML = originalButtonHTML; saveButton.disabled = false; }
    });

    multiprojectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[APP.JS] multiprojectForm submitted.');
        if (!currentSelectedClass) { alert("Select a class!"); return; }
        const globalTitle = multiprojectGlobalTitleInput.value.trim();
        if (!globalTitle) { alert("Overall Assignment Title is mandatory!"); multiprojectGlobalTitleInput.focus(); return; }

        const projectsData = [];
        let formIsValid = true;

        projectTabsContent.querySelectorAll('.tab-pane').forEach(pane => {
            if (!formIsValid) return;
            const clientProjectId = pane.dataset.clientProjectId;
            const realProjectId = pane.querySelector('.project-real-id').value;
            const tabButton = projectTabsList.querySelector(`button[data-bs-target="#project-pane-${clientProjectId}"]`);
            const projectTitle = tabButton ? tabButton.querySelector('.project-tab-title').textContent.trim() : '';

            if (!projectTitle) {
                alert("A project title (tab name) is empty. Please name all projects.");
                tabButton.querySelector('.project-tab-title').focus();
                formIsValid = false; return;
            }

            const projectSubtitle = pane.querySelector('.project-subtitle').value.trim();
            const projectDescription = pane.querySelector('.project-description').value.trim();
            const projectDeadlineValue = pane.querySelector('.project-deadline').value;
            let projectDeadlineTimestamp = projectDeadlineValue ? firebase.firestore.Timestamp.fromDate(new Date(projectDeadlineValue)) : null;

            const projectLinks = [];
            pane.querySelectorAll('.project-links-container .link-entry').forEach(entry => {
                const urlInput = entry.querySelector('.link-url');
                const url = urlInput.value.trim();
                const desc = entry.querySelector('.link-description').value.trim();
                 if (url) {
                    try { new URL(url); projectLinks.push({ url, description: desc }); urlInput.classList.remove('is-invalid');}
                    catch (_) { formIsValid = false; urlInput.classList.add('is-invalid'); alert(`Invalid URL in project "${projectTitle}": ${url}`);}
                } else if (desc) { formIsValid = false; urlInput.classList.add('is-invalid'); alert(`Missing URL for a description in project "${projectTitle}".`);}
                else {urlInput.classList.remove('is-invalid');}
            });
            if (!formIsValid) return;

            projectsData.push({
                projectId: realProjectId || db.collection('assignments').doc().id, projectTitle,
                projectSubtitle: projectSubtitle || null, projectDescription: projectDescription || null,
                projectLinks, projectDeadline: projectDeadlineTimestamp,
            });
        });

        if (!formIsValid) { console.warn('[APP.JS] Multi-project form invalid.'); return; }
        if (projectsData.length === 0) { alert("Please add at least one project."); return; }

        const assignmentPayload = {
            classId: currentSelectedClass, assignmentGlobalTitle: globalTitle,
            isMultiProject: true, projects: projectsData,
        };
        console.debug('[APP.JS] Multi-project payload:', assignmentPayload);

        const saveButton = multiprojectForm.querySelector('button[type="submit"]');
        const originalButtonHTML = saveButton.innerHTML;
        saveButton.innerHTML = `Saving... <span class="spinner-border spinner-border-sm"></span>`;
        saveButton.disabled = true;

        try {
            if (editingAssignmentId && editingAssignmentType === 'multi') {
                assignmentPayload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('assignments').doc(editingAssignmentId).update(assignmentPayload);
                console.log(`[APP.JS] Updated multi-project assignment ID: ${editingAssignmentId}`);
            } else {
                assignmentPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await db.collection('assignments').add(assignmentPayload);
                console.log(`[APP.JS] Added new multi-project assignment ID: ${docRef.id}`);
            }
            multiprojectForm.reset();
            projectTabsList.innerHTML = '';
            projectTabsContent.innerHTML = '';
            multiprojectFormContainer.style.display = 'none';
            editingAssignmentId = null;
            loadAssignments(currentSelectedClass);
            alert("Multi-project assignment saved!");
        } catch (error) { console.error("[APP.JS] Error saving multi-project assignment:", error); alert("Error: " + error.message); }
        finally { saveButton.innerHTML = originalButtonHTML; saveButton.disabled = false; }
    });

    async function loadAssignmentForEdit(id, type) {
        console.log(`[APP.JS] loadAssignmentForEdit called. ID: ${id}, Type: ${type}`);
        editingAssignmentId = id;
        editingAssignmentType = type;
        try {
            const doc = await db.collection('assignments').doc(id).get();
            if (!doc.exists) { alert("Assignment not found!"); console.warn(`[APP.JS] Assignment ${id} not found for edit.`); return; }
            const data = doc.data();
            console.debug(`[APP.JS] Editing assignment data:`, data);

            if (type === 'single' && !data.isMultiProject) {
                console.log('[APP.JS] Loading single-project assignment for edit.');
                singleProjectFormTitleTextEl.innerHTML = '<i class="fas fa-file-alt text-primary"></i> Edit Single-Project Assignment';
                singleProjectAssignmentIdInput.value = id;
                singleProjectTitleInput.value = data.title || '';
                singleProjectSubtitleInput.value = data.subtitle || '';
                singleProjectDescriptionInput.value = data.description || '';
                singleProjectDeadlineInput.value = data.deadline ? formatToDateTimeLocal(data.deadline.toDate()) : '';
                
                singleProjectLinksContainer.innerHTML = '';
                if (data.links && data.links.length > 0) {
                    data.links.forEach(link => addLinkFieldToSpecificContainer(singleProjectLinksContainer, link.url, link.description));
                } else {
                    addLinkFieldToSpecificContainer(singleProjectLinksContainer);
                }
                singleProjectFormContainer.style.display = 'block';
                multiprojectFormContainer.style.display = 'none';
                singleProjectTitleInput.focus();
                window.scrollTo({ top: singleProjectFormContainer.offsetTop - 70, behavior: 'smooth' });
            } else if (type === 'multi' && data.isMultiProject) {
                console.log('[APP.JS] Loading multi-project assignment for edit.');
                multiprojectFormTitleTextEl.innerHTML = '<i class="fas fa-layer-group text-info"></i> Edit Multi-Project Assignment';
                multiprojectAssignmentIdInput.value = id;
                multiprojectGlobalTitleInput.value = data.assignmentGlobalTitle || '';

                projectTabsList.innerHTML = '';
                projectTabsContent.innerHTML = '';
                projectClientTabCounter = 0;

                if (data.projects && data.projects.length > 0) {
                    data.projects.forEach(pData => addNewProjectTab(pData));
                } else {
                    addNewProjectTab();
                }
                multiprojectFormContainer.style.display = 'block';
                singleProjectFormContainer.style.display = 'none';
                multiprojectGlobalTitleInput.focus();
                window.scrollTo({ top: multiprojectFormContainer.offsetTop - 70, behavior: 'smooth' });
            } else {
                alert("Mismatch in assignment type or data structure.");
                console.error(`[APP.JS] Mismatch in assignment type for edit. Expected ${type}, data.isMultiProject is ${data.isMultiProject}`);
                editingAssignmentId = null; editingAssignmentType = null;
                return;
            }
        } catch (error) {
            console.error("[APP.JS] Error fetching assignment for edit: ", error);
            alert("Error fetching assignment for edit: " + error.message);
            editingAssignmentId = null; editingAssignmentType = null;
        }
    }

    async function deleteAssignment(id) {
        console.log(`[APP.JS] deleteAssignment called for ID: ${id}`);
        if (confirm("Are you sure you want to delete this assignment? This action cannot be undone.")) {
            try {
                await db.collection('assignments').doc(id).delete();
                console.log(`[APP.JS] Assignment ${id} deleted successfully.`);
                if (editingAssignmentId === id) {
                    singleProjectFormContainer.style.display = 'none';
                    multiprojectFormContainer.style.display = 'none';
                    editingAssignmentId = null;
                }
                loadAssignments(currentSelectedClass);
                alert("Assignment deleted.");
            } catch (error) { console.error(`[APP.JS] Error deleting assignment ${id}:`, error); alert("Error deleting: " + error.message); }
        } else {
            console.log(`[APP.JS] Deletion of assignment ${id} cancelled by user.`);
        }
    }
    
    window.initDashboardApp = () => {
        console.log("[APP.JS] initDashboardApp called by auth.js");
        if (!currentSelectedClass && classes.length > 0) {
            console.log("[APP.JS] Auto-selecting first class:", classes[0]);
            selectClass(classes[0]);
            const firstClassLink = sidebarNav.querySelector(`.nav-link[data-class="${classes[0]}"]`);
            if (firstClassLink) {
                firstClassLink.classList.add('active');
            }
        }
    };
    console.log('[APP.JS] Script loaded and event listeners (should be) attached.');
});