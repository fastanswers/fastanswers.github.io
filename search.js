        // State
        let currentTab = 'text';
        let cachedWikiData = null; 
        let cachedImages = null; 
        let cachedVideos = null; // Separate cache for video results
        let lastQuery = '';

        // --- Web Fetching Logic ---

        function extractKeywords(sentence) {
            const stopwords = ["what", "happens", "if", "i", "my", "the", "a", "an", "is", "are", "to", "do", "does"];
            return sentence.split(' ')
                .filter(word => !stopwords.includes(word.toLowerCase().replace(/[^a-z]/g, '')))
                .join(' ');
        }

        // Text Fetch
        async function searchWikipediaText(query, useSimple = true, useKeywords = false) {
            const lang = useSimple ? 'simple' : 'en';
            let actualQuery = useKeywords ? extractKeywords(query) : query;
            if (!actualQuery) actualQuery = query;

            try {
                const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(actualQuery)}&format=json&origin=*`;
                const searchRes = await fetch(searchUrl);
                const searchData = await searchRes.json();
                
                if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
                    if (useSimple) return await searchWikipediaText(query, false, useKeywords);
                    else if (!useKeywords) return await searchWikipediaText(query, true, true);
                    throw new Error("No results");
                }

                const title = searchData.query.search[0].title;
                const detailsUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|info|extlinks&titles=${encodeURIComponent(title)}&exintro&explaintext&inprop=url&ellimit=5&redirects=1&origin=*`;
                
                const detailsRes = await fetch(detailsUrl);
                const detailsData = await detailsRes.json();
                const pageId = Object.keys(detailsData.query.pages)[0];
                return { ...detailsData.query.pages[pageId], sourceLang: lang };

            } catch (error) {
                if (useSimple) return await searchWikipediaText(query, false, useKeywords);
                throw error;
            }
        }

        // Image Fetch
        async function searchWikipediaImages(query) {
            const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=pageimages&pithumbsize=600&format=json&origin=*`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (!data.query || !data.query.pages) return [];

            return Object.values(data.query.pages)
                .filter(page => page.thumbnail && page.thumbnail.source)
                .map(page => ({
                    src: page.thumbnail.source,
                    title: page.title,
                }))
                .slice(0, 5);
        }

        // Video Fetch (New)
        async function searchWikipediaVideos(query) {
            // Search specifically for video files (File namespace + 'video' type hint)
            const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}%20filetype:video&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|mime|thumb&iiurlwidth=400&format=json&origin=*`;
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (!data.query || !data.query.pages) return [];

            return Object.values(data.query.pages)
                .filter(page => page.imageinfo && page.imageinfo[0] && page.imageinfo[0].mime.includes('video'))
                .map(page => ({
                    src: page.imageinfo[0].url,
                    thumb: page.imageinfo[0].thumburl,
                    title: page.title.replace("File:", ""),
                    mime: page.imageinfo[0].mime
                }))
                .slice(0, 5);
        }

        // --- UI Logic ---

        function setLoading(isLoading, text = "Fetching...") {
            document.getElementById('loadingIndicator').style.display = isLoading ? 'flex' : 'none';
            document.getElementById('loadingText').innerText = text;
            
            const content = document.getElementById('resultContent');
            const links = document.getElementById('linksSection');
            
            if (isLoading) {
                content.innerHTML = '';
                links.style.opacity = '0.5';
            } else {
                links.style.opacity = '1';
            }
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`tab-${tabName}`).classList.add('active');
            currentTab = tabName;
            triggerSearch();
        }

        async function triggerSearch() {
            const query = document.getElementById('queryInput').value.trim();
            const resultsContainer = document.getElementById('resultsContainer');
            
            if (!query) return;
            
            if (query !== lastQuery) {
                cachedWikiData = null;
                cachedImages = null;
                cachedVideos = null;
                lastQuery = query;
            }

            resultsContainer.classList.remove('hidden');
            const linksSection = document.getElementById('linksSection');
            linksSection.style.display = (currentTab === 'text' || currentTab === 'detailed') ? 'block' : 'none';

            // Route based on Tab
            if (currentTab === 'images') {
                if (cachedImages) renderMediaGrid(cachedImages, 'image');
                else {
                    setLoading(true, "Finding images...");
                    try {
                        const images = await searchWikipediaImages(query);
                        cachedImages = images;
                        renderMediaGrid(images, 'image');
                    } catch (e) {
                        console.error(e);
                        document.getElementById('resultContent').innerHTML = "<p>No images found.</p>";
                    } finally {
                        setLoading(false);
                    }
                }
            } 
            else if (currentTab === 'videos') {
                if (cachedVideos) renderMediaGrid(cachedVideos, 'video');
                else {
                    setLoading(true, "Finding videos...");
                    try {
                        const videos = await searchWikipediaVideos(query);
                        cachedVideos = videos;
                        renderMediaGrid(videos, 'video');
                    } catch (e) {
                        console.error(e);
                        document.getElementById('resultContent').innerHTML = "<p>No videos found.</p>";
                    } finally {
                        setLoading(false);
                    }
                }
            }
            else {
                // Text or Detailed
                if (cachedWikiData) renderTextContent(cachedWikiData);
                else {
                    setLoading(true, "Summarising...");
                    try {
                        const data = await searchWikipediaText(query);
                        cachedWikiData = data;
                        renderTextContent(data);
                    } catch (e) {
                        console.error(e);
                        document.getElementById('resultContent').innerHTML = "Could not find a summary.";
                        document.getElementById('linksDisplay').innerHTML = "";
                    } finally {
                        setLoading(false);
                    }
                }
            }
        }

        function renderTextContent(data) {
            const contentDiv = document.getElementById('resultContent');
            renderLinks(data);

            if (currentTab === 'text') {
                let fullText = data.extract || "No text available.";
                fullText = fullText.replace(/\s*\([^)]*\)/g, "");
                const sentenceMatch = fullText.match(/^.*?[.!?](?=\s|$)/);
                if (sentenceMatch) fullText = sentenceMatch[0];
                
                const words = fullText.trim().split(/\s+/);
                const shortText = words.slice(0, 15).join(" ");
                const suffix = words.length > 15 ? "..." : "";
                
                contentDiv.innerHTML = `<p class="text-2xl font-bold leading-snug">${shortText}${suffix}</p>`;
            } 
            else if (currentTab === 'detailed') {
                contentDiv.innerHTML = `<div class="text-base leading-relaxed whitespace-pre-wrap">${data.extract || "No details available."}</div>`;
            } 
        }

        // Unified Render for Images and Videos
        function renderMediaGrid(items, type) {
            const contentDiv = document.getElementById('resultContent');
            
            if (items.length === 0) {
                contentDiv.innerHTML = `<p>No ${type}s found.</p>`;
                return;
            }

            let html = '<div class="grid grid-cols-2 md:grid-cols-3 gap-4">';
            items.forEach((item) => {
                const safeTitle = item.title.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                const safeSrc = item.src;
                const displayThumb = type === 'video' ? item.thumb : item.src;
                const iconOverlay = type === 'video' ? '<div class="absolute inset-0 flex items-center justify-center"><div class="bg-black bg-opacity-50 rounded-full p-2"><svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg></div></div>' : '';
                
                html += `
                    <div onclick="openModal('${safeSrc}', '${safeTitle}', '${type}')" class="cursor-pointer group relative aspect-square border-2 border-black rounded-lg overflow-hidden bg-gray-100 hover:shadow-md transition-all">
                        <img src="${displayThumb}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                        ${iconOverlay}
                        <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 truncate">
                            ${item.title}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
            contentDiv.innerHTML = html;
        }

        function renderLinks(data) {
            const display = document.getElementById('linksDisplay');
            let html = "";
            if (data.fullurl) {
                html += `<p><a href="${data.fullurl}" target="_blank" class="text-blue-600 underline hover:text-blue-800 font-bold">Read full article on Wikipedia</a></p>`;
            }
            if (data.extlinks) {
                const validLinks = data.extlinks.map(l => l['*']).filter(u => u.startsWith('http'));
                validLinks.slice(0, 3).forEach(url => {
                    try {
                        html += `<p class="truncate"><a href="${url}" target="_blank" class="text-blue-600 underline hover:text-blue-800">External Reference</a> <span class="text-gray-500 text-xs ml-2">${new URL(url).hostname}</span></p>`;
                    } catch (e) {}
                });
            }
            display.innerHTML = html || '<p class="text-gray-400">No direct links found.</p>';
        }

        // --- Modal Logic ---

        function openModal(src, title, type) {
            const modal = document.getElementById('mediaModal');
            const modalImg = document.getElementById('modalImage');
            const modalVideo = document.getElementById('modalVideo');
            const modalSource = document.getElementById('modalSource');
            
            modalSource.innerText = title;

            if (type === 'video') {
                modalImg.classList.add('hidden');
                modalVideo.classList.remove('hidden');
                modalVideo.src = src;
                modalVideo.play();
            } else {
                modalVideo.pause();
                modalVideo.classList.add('hidden');
                modalImg.classList.remove('hidden');
                modalImg.src = src;
            }
            
            modal.classList.remove('hidden');
        }

        function closeModal() {
            const modal = document.getElementById('mediaModal');
            const modalVideo = document.getElementById('modalVideo');
            
            modalVideo.pause();
            modalVideo.src = ""; // Clear source to stop buffering
            modal.classList.add('hidden');
        }

        document.getElementById('mediaModal').addEventListener('click', function(e) {
            if (e.target === this) closeModal();
        });

        document.getElementById('queryInput').addEventListener('keypress', function (e) {
            if (e.key === 'Enter') triggerSearch();
        });
